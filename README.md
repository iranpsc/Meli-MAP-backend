# Meli MAP (National Map)

Meli MAP is a map-only application. Its editable frontend source uses MapLibre GL JS to render the project's vector tiles and Three.js to place the FBX models on the map. The Express backend serves the map APIs and, in development, the Vite-powered frontend from a single process.

## Features

- Provides a small, editable map frontend in `frontend/src/`.
- Renders the vector style defined in `frontend/public/styleMap.json` and `frontend/public/tile.json`.
- Loads the Shahid and office FBX models at their configured map coordinates.
- Fetches and caches vector map tiles (`.mvt`) and map fonts.
- Uses MySQL to store cached tiles and fonts.
- Runs the website and API together on port `3001`.

## Prerequisites

- Git
- Node.js 22 or later and npm
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

Run the backend and editable frontend together from the project root:

```bash
npm run dev
```

Open the website at [http://localhost:3001](http://localhost:3001). The app uses the MySQL database settings described above for tile and font caching.

Create a production frontend bundle with:

```powershell
npm run build
```

Then run the production server with `npm start`.

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

The frontend is source code, not the previous prebuilt application bundle. The main files for map development are:

| File | Description |
| --- | --- |
| [`frontend/src/main.js`](./frontend/src/main.js) | MapLibre map setup and FBX model placement |
| [`frontend/src/style.css`](./frontend/src/style.css) | Map container and loading-status styles |
| [`frontend/public/styleMap.json`](./frontend/public/styleMap.json) | Map styling, layers, colors, labels, and map source configuration |
| [`frontend/public/tile.json`](./frontend/public/tile.json) | TileJSON configuration and vector layer definitions |
| [`frontend/public/shahid.fbx`](./frontend/public/shahid.fbx), [`frontend/public/office.fbx`](./frontend/public/office.fbx) | FBX models displayed on the map at zoom level 16 and above |
| [`index.js`](./index.js) | API endpoints, MySQL connection, tile/font fetching and caching, and Vite development server |
| [`schema.sql`](./schema.sql) | Database and cache table definitions |
| [`vite.config.mjs`](./vite.config.mjs) | Frontend development and production build settings |

### Changing the map

Edit `frontend/src/main.js` to change map initialization, controls, or model locations. Click a model marker on the map to zoom to the FBX location; models render at zoom level 16 and above. Update `frontend/public/styleMap.json` for map styling and `frontend/public/tile.json` for vector tile metadata and layer definitions. The style references `/tile.json`, which provides the backend tile endpoint `/tiles/{z}/{x}/{y}.mvt`.

Run `npm run dev` to apply source changes, or `npm run build` to generate the production frontend. Use the browser's Network panel to inspect requests to `/styleMap.json`, `/tile.json`, `/tiles/...mvt`, and `/fonts/...`.

FBX files in `frontend/public/` are served from the site root. Update the model locations in `frontend/src/main.js` when adding, removing, or moving map models.

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
   - Use `frontend/src/main.js` to update map behavior and FBX model locations.
   - Use `frontend/public/styleMap.json` to update the map style.
   - Use `frontend/public/tile.json` to configure vector tile sources and layers.
4. Start the server and verify the map changes and API responses in your browser.
5. Before committing, ensure that no `.env` files, database passwords, or private data are included.
6. Commit your changes and open a Pull Request.

If you modify the database schema, document the changes in `schema.sql` as well.

If you change frontend paths or names, verify the Vite entry point, map configuration, and server implementation.

## Project Structure

```text
.
├── index.js                 # Express server and map API
├── package.json             # npm scripts and dependencies
├── schema.sql               # Database cache schema
├── docker-compose.yml       # Application and MySQL services
├── frontend/
│   ├── index.html           # Map app entry point
│   ├── src/                 # Editable map and model source
│   ├── public/              # Tile/style JSON and FBX map models
│   └── dist/                # Generated by npm run build
├── vite.config.mjs          # Frontend build and development config
└── README.md
```

## License

See [`LICENSE`](./LICENSE) for licensing information.
