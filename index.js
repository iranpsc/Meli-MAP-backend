const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

let db;
let reconnectTimer;

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));

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

const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`Map API is running on port ${port}`);
});
