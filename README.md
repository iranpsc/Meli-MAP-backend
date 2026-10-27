# Meli MAP (National Map)

Meli MAP is a mapping project consisting of a map website and a backend API built with Node.js. The Express server serves the frontend files and handles map requests in a single application. There is no need to run a separate frontend development server or Apache through XAMPP for local development.

## Features

- Serves the prebuilt frontend from the `public/` directory.
- Fetches and caches vector map tiles (`.mvt`) and map fonts.
- Uses MySQL to store cached tiles and fonts.
- Runs the website and API together on port `3001`.

## Prerequisites

- Git
- Node.js 18 or later and npm
- MySQL (XAMPP can be used for local development)
- An internet connection to fetch tiles and fonts that are not yet cached

## Clone and Run the Project Locally

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/iranpsc/Meli-MAP-backend.git
cd Meli-MAP-backend
npm install
```

### Database Setup with XAMPP

1. Start the **MySQL** service in XAMPP. Apache does not need to be started.
2. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Import the [`schema.sql`](./schema.sql) file using the **Import** tab. This file creates the `map_main` database and the `tiles` and `fonts` tables.
4. The default backend configuration is compatible with a standard XAMPP installation: host `127.0.0.1`, port `3306`, username `root`, and an empty password.

If your MySQL configuration differs, set the environment variables in PowerShell before starting the application:

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your-database-password"
$env:DB_NAME = "map_main"
```

Node.js does not automatically load `.env` files. The project's `.env` file is intended for Docker Compose. When running Node.js directly, configure the environment variables as shown above.

### Start the Website and API

Run the following command from the project root:

```bash
npm run dev
```

The following command is also available for regular execution and Docker environments:

```bash
npm start
```

Open the website in your browser:

[http://localhost:3001](http://localhost:3001)

To check whether the server is running, open:

[http://localhost:3001/health](http://localhost:3001/health)

A healthy server returns:

```json
{
  "status": "ok"
}
```

The website may load even when the database is unavailable. However, the tile and font APIs require MySQL to read from or write to the cache. MySQL connection status is displayed in the Node.js terminal.

## Working with the Map

The current frontend is provided as prebuilt files. The original React/Vite source code is not included in this repository.

The following files contain the main editable map configuration and backend implementation:

| File | Description |
| --- | --- |
| [`public/styleMap.json`](./public/styleMap.json) | Map styling, layers, colors, labels, and map source configuration |
| [`public/tile.json`](./public/tile.json) | TileJSON configuration and vector layer definitions |
| [`index.js`](./index.js) | API endpoints, MySQL connection, and tile/font fetching and caching |
| [`schema.sql`](./schema.sql) | Database and cache table definitions |
| `public/assets/` | Prebuilt frontend assets, images, and UI resources |

### Changing the Map Appearance

To change the map's appearance, start by editing `public/styleMap.json`.

The map source currently points to `/tile.json`. The TileJSON file connects vector tile requests to `/tiles/{z}/{x}/{y}.mvt`.

When serving configuration files, the server converts these paths into absolute URLs pointing to the same server. Do not change them to relative paths or hardcode a specific domain unless you also update the map-serving configuration.

After saving your changes, refresh the page and open **Developer Tools → Network** to verify that the following requests return successful responses:

- `/styleMap.json`
- `/tile.json`
- `/tiles/...mvt`
- `/fonts/...`

You can also test a sample tile directly:

[http://localhost:3001/tiles/11/1309/802.mvt](http://localhost:3001/tiles/11/1309/802.mvt)

### Frontend Assets

The `public/assets/` directory contains the compiled frontend output. Editing JavaScript or CSS files in this directory directly is not recommended because the changes may be overwritten by a future build.

Major frontend changes require the original frontend source code and its build process.

Keep the files in this directory intact because the current website depends on them.

### Tile and Font Caching

Tiles that are not already cached are fetched from CARTO. Therefore, an internet connection is required the first time a particular tile is requested.

Subsequent requests can be served from the local MySQL database.

The same caching mechanism is used for map fonts.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Checks server health |
| `GET` | `/styleMap.json` | Returns the map style configuration |
| `GET` | `/tile.json` | Returns TileJSON metadata and vector layer definitions |
| `GET` | `/tiles/:zoom/:x/:y.mvt` | Returns a vector map tile |
| `GET` | `/fonts/:fontStack/:fontRange` | Returns map font data |

### Example Requests

Vector tile:

[http://localhost:3001/tiles/11/1309/802.mvt](http://localhost:3001/tiles/11/1309/802.mvt)

Map font:

[http://localhost:3001/fonts/Noto%20Sans%20Regular/0-255](http://localhost:3001/fonts/Noto%20Sans%20Regular/0-255)

## Running the Project with Docker

If Docker Desktop and Docker Compose are installed, you do not need to run XAMPP for the database. Docker Compose starts its own MySQL service.

In PowerShell, create `.env` from the example if you do not already have one:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Open `.env` and set non-empty values for both `MYSQL_ROOT_PASSWORD` and `DB_PASSWORD`.
If `.env` already exists, make sure these keys are present and not blank; do not overwrite
your existing environment file with the example. Keep `.env` private and do not commit it.

For example, the file should contain:

```dotenv
MYSQL_ROOT_PASSWORD=your-strong-root-password
DB_PASSWORD=your-strong-map-password
```

Docker Desktop must be running before you start the services.

Build and start the application:

```powershell
docker compose up --build -d
```

The website will be available at:

[http://localhost:3001](http://localhost:3001)

To follow the application logs:

```powershell
docker compose logs -f app
```

To stop the services:

```powershell
docker compose down
```

## Contributing

1. Clone the repository and follow the local setup instructions.
2. Create a separate branch for your changes:

   ```bash
   git switch -c feature/map-style-update
   ```

3. Modify the relevant files:
   - Use `public/styleMap.json` to update the map style.
   - Use `public/tile.json` to configure vector tile sources and layers.
4. Start the server and verify the map changes and API responses in your browser.
5. Before committing, ensure that no `.env` files, database passwords, or private data are included.
6. Commit your changes and open a Pull Request.

If you modify the database schema, document the changes in `schema.sql` as well.

If you change the paths or names of frontend files, verify all related references in `public/index.html`, the map configuration, and the server implementation.

## Project Structure

```text
.
├── index.js                 # Express server and map API
├── package.json             # npm scripts and dependencies
├── schema.sql               # Database cache schema
├── docker-compose.yml       # Application and MySQL services
├── public/
│   ├── index.html           # Main website entry point
│   ├── styleMap.json        # Map style configuration
│   ├── tile.json            # Vector tile metadata and layer definitions
│   ├── assets/              # Prebuilt frontend assets
│   ├── Build/               # Unity build files
│   └── fonts/               # UI fonts
└── README.md
```

## License

See [`LICENSE`](./LICENSE) for licensing information.
