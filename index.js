const path = require("path");
const fs = require("fs").promises;
const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const app = express();
const frontendDirectory = path.resolve(
  process.env.FRONTEND_DIR || path.join(__dirname, "frontend", "dist")
);
const mapDataDirectory = path.resolve(
  process.env.MAP_DATA_DIR || path.join(__dirname, "frontend", "public")
);

const mapConfigLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // Maximum 60 requests per minute per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});
let db;
let reconnectTimer;

app.use(cors());

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    handleDisconnect();
  }, 2000);
}

function handleDisconnect() {
  db = mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "map_main",
  });

  db.connect((error) => {
    if (error) {
      console.error("Error connecting to MySQL database:", error);
      scheduleReconnect();
    } else {
      console.log("Connected to MySQL database");
    }
  });

  db.on("error", (error) => {
    console.error("Database error:", error);
    if (error.code === "PROTOCOL_CONNECTION_LOST" || error.fatal) {
      scheduleReconnect();
    }
  });
}

function query(sql, values) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

handleDisconnect();

const baseUrl =
  "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/";

async function downloadTile(zoom, x, y) {
  const url = `${baseUrl}${zoom}/${x}/${y}.mvt`;
  const response = await axios({
    method: "GET",
    url,
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function absoluteFrontendUrl(req, resourceUrl) {
  if (!resourceUrl.startsWith("/")) {
    return resourceUrl;
  }

  return `${req.protocol}://${req.get("host")}${resourceUrl}`;
}

app.get("/tile.json", async (req, res) => {
  try {
    const tileConfig = JSON.parse(
      await fs.readFile(path.join(mapDataDirectory, "tile.json"), "utf8")
    );
    tileConfig.tiles = tileConfig.tiles.map((url) =>
      absoluteFrontendUrl(req, url)
    );
    res.set("Cache-Control", "no-store");
    res.json(tileConfig);
  } catch (error) {
    console.error("Error serving tile configuration:", error);
    res.status(500).send("Unable to serve tile configuration");
  }
});

app.get("/styleMap.json", mapConfigLimiter, async (req, res) => {
  try {
    const style = JSON.parse(
      await fs.readFile(
        path.join(mapDataDirectory, "styleMap.json"),
        "utf8"
      )
    );

    style.sources.carto.url = absoluteFrontendUrl(
      req,
      style.sources.carto.url
    );

    style.glyphs = absoluteFrontendUrl(req, style.glyphs);

    res.set("Cache-Control", "no-store");
    res.json(style);
  } catch (error) {
    console.error("Error serving map style:", error);
    res.status(500).send("Unable to serve map style");
  }
});
app.get("/tiles/:zoom/:x/:y", async (req, res) => {
  const { zoom, x } = req.params;
  const y = req.params.y.replace(/\.mvt$/, "");
  const parsedZoom = Number(zoom);
  const parsedX = Number(x);
  const parsedY = Number(y);

  if (
    !/^\d+$/.test(zoom) ||
    !/^\d+$/.test(x) ||
    !/^\d+$/.test(y) ||
    ![parsedZoom, parsedX, parsedY].every(Number.isSafeInteger)
  ) {
    res.status(400).send("Invalid tile coordinates");
    return;
  }

  try {
    const results = await query(
      "SELECT data FROM tiles WHERE zoom = ? AND x = ? AND y = ?",
      [parsedZoom, parsedX, parsedY]
    );

    if (results.length > 0 && results[0].data) {
      res.type("application/vnd.mapbox-vector-tile").send(results[0].data);
      return;
    }

    const tileData = await downloadTile(parsedZoom, parsedX, parsedY);
    await query(
      "INSERT INTO tiles(zoom, x, y, data) VALUES(?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
      [parsedZoom, parsedX, parsedY, tileData]
    );
    res.type("application/vnd.mapbox-vector-tile").send(tileData);
  } catch (error) {
    console.error("Error serving map tile:", error);
    res.status(500).send("Unable to retrieve map tile");
  }
});


async function downloadFontData(fontStack, fontRange) {
  const allowedFontStackPattern = /^[a-zA-Z0-9 _-]+$/;
  const fontRangePattern = /^\d+-\d+$/;

  if (
    typeof fontStack !== "string" ||
    !allowedFontStackPattern.test(fontStack)
  ) {
    throw new Error("Invalid font stack");
  }

  if (
    typeof fontRange !== "string" ||
    !fontRangePattern.test(fontRange)
  ) {
    throw new Error("Invalid font range");
  }

  const [start, end] = fontRange.split("-").map(Number);

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    end > 0xffff
  ) {
    throw new Error("Font range is out of bounds");
  }

  const fontUrl = new URL(
    `https://tiles.basemaps.cartocdn.com/fonts/${encodeURIComponent(
      fontStack
    )}/${fontRange}.pbf`
  );

  const response = await axios({
    method: "GET",
    url: fontUrl.href,
    responseType: "arraybuffer",
    timeout: 10000,
    maxRedirects: 0,
  });

  return Buffer.from(response.data);
}

app.get("/fonts/:fontStack/:fontRange", async (req, res) => {
  const { fontStack, fontRange } = req.params;

  try {
    const results = await query(
      "SELECT data FROM fonts WHERE name = ? AND font_range = ?",
      [fontStack, fontRange]
    );

    if (results.length > 0 && results[0].data) {
      res.type("application/x-protobuf").send(results[0].data);
      return;
    }

    const fontData = await downloadFontData(fontStack, fontRange);
    await query(
      "INSERT INTO fonts(name, font_range, data) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
      [fontStack, fontRange, fontData]
    );
    res.type("application/x-protobuf").send(fontData);
  } catch (error) {
    console.error("Error serving map font:", error);
    res.status(500).send("Unable to retrieve map font");
  }
});

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(frontendDirectory));

    app.get("*", (req, res) => {
      if (!req.accepts("html")) {
        res.sendStatus(404);
        return;
      }

      res.sendFile(path.join(frontendDirectory, "index.html"), (error) => {
        if (error) {
          console.error("Error serving frontend:", error);
          if (!res.headersSent) {
            res.status(error.statusCode || 500).send("Unable to serve frontend");
          }
        }
      });
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: path.join(__dirname, "vite.config.mjs"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3001;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Error starting the application:", error);
  process.exitCode = 1;
});
