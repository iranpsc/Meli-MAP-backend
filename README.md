# Meli MAP (National Map)

Meli MAP consists of two independent projects: a Node.js/Express backend API with a MySQL tile cache, and a MapLibre/Three.js frontend. Each project has its own dependencies, Dockerfile, and deployment lifecycle. The frontend connects to the backend using `VITE_API_BASE_URL`.

## Features

- Provides API endpoints for vector tiles and map fonts.
- Fetches and caches vector tiles (`.mvt`) and fonts in MySQL.
- The frontend repository contains the editable map source, style, TileJSON, and FBX models.

## Prerequisites

- Git
- Node.js 22 or later and npm
- MySQL (XAMPP can be used for local development)
- An internet connection to fetch tiles and fonts that are not yet cached

## Run the Backend Locally

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

### Start the API

Start the backend API:

```bash
npm run dev
```

The API listens on port `3001`. To check it, open [http://localhost:3001/health](http://localhost:3001/health).

## Run the Frontend Locally

Clone the separate frontend repository beside the backend (once its remote is published):

```powershell
git clone <frontend-repository-url> ..\Meli-MAP-frontend
Set-Location ..\Meli-MAP-frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite development server prints the frontend URL (normally `http://localhost:5173`). Set `VITE_API_BASE_URL` in the frontend `.env` to the backend's reachable URL; the default is `http://localhost:3001`. The backend accepts cross-origin requests by default. To restrict CORS, set `CORS_ORIGIN` to the allowed frontend origins, separated by commas, before starting the backend.

## Frontend Map Files

| File | Description |
| --- | --- |
| Separate `Meli-MAP-frontend` repository | MapLibre source, style/TileJSON, FBX assets, and its own Dockerfile |
| `src/main.js` in the frontend repository | Map initialization, API URL, and FBX model placement |
| `public/styleMap.json` and `public/tile.json` in the frontend repository | Map style, vector source, and tile template |
| `public/*.fbx` in the frontend repository | Map models displayed at zoom level 16 and above |
| [`index.js`](./index.js) | Backend API endpoints and MySQL cache |
| [`schema.sql`](./schema.sql) | Database and cache table definitions |

The frontend owns the style and TileJSON files. At startup it rewrites tile and font URLs to the configured backend API. Click a model marker to zoom to its FBX location; models render at zoom level 16 and above.

### Tile and Font Caching

Tiles that are not already cached are fetched from CARTO. Therefore, an internet connection is required the first time a particular tile is requested.

Subsequent requests can be served from the local MySQL database.

The same caching mechanism is used for map fonts.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Checks server health |
| `GET` | `/tiles/:zoom/:x/:y.mvt` | Returns a vector map tile |
| `GET` | `/fonts/:fontStack/:fontRange` | Returns map font data |

### Example Requests

Vector tile:

[http://localhost:3001/tiles/11/1309/802.mvt](http://localhost:3001/tiles/11/1309/802.mvt)

Map font:

[http://localhost:3001/fonts/Noto%20Sans%20Regular/0-255](http://localhost:3001/fonts/Noto%20Sans%20Regular/0-255)

## Run the Backend with Docker

The backend repository's Compose file starts only the API and its MySQL cache. The frontend is built and run independently from its own repository and Dockerfile.

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
CORS_ORIGIN=https://map.metarang.com,http://map.metarang.com
```

Docker Desktop must be running before you start the services.

Build and start the application:

```powershell
docker compose up --build -d
```

The backend API will be available at:

[http://localhost:3001/health](http://localhost:3001/health)

To follow the application logs:

```powershell
docker compose logs -f app
```

To stop the services:

```powershell
docker compose down
```

## Run the Frontend with Docker

From the frontend repository, build the static map image with the public backend URL:

```powershell
docker build --build-arg VITE_API_BASE_URL=http://localhost:3001 -t meli-map-frontend .
docker run --rm -p 8080:80 meli-map-frontend
```

The map UI will be available at [http://localhost:8080](http://localhost:8080). Set `VITE_API_BASE_URL` to the externally reachable backend URL when building for deployment, and set the backend's `CORS_ORIGIN` to the frontend's origin.

## Contributing

The frontend and backend are versioned and deployed separately. Make frontend changes in the `Meli-MAP-frontend` repository and API/database changes in this repository. Configure the deployed frontend's `VITE_API_BASE_URL` and backend's `CORS_ORIGIN` to point to one another.

1. Create a separate branch for your changes:

   ```bash
   git switch -c feature/map-style-update
   ```

2. Modify the files in the relevant repository.
3. Start the API and frontend independently and verify the map and API requests.
4. Before committing, ensure that no `.env` files, database passwords, or private data are included.
5. Commit your changes and open a Pull Request.

If you modify the database schema, document the changes in `schema.sql` as well.

## Project Structure

```text
.
├── index.js            # Express map API
├── package.json        # Backend dependencies and scripts
├── schema.sql          # MySQL cache schema
├── Dockerfile          # Backend API image
└── docker-compose.yml  # Backend API and MySQL
```

## License

See [`LICENSE`](./LICENSE) for licensing information.
