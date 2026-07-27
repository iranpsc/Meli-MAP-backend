# Meli MAP Backend

Backend service for serving and caching vector map tiles and map font resources for the **Meli MAP** mapping infrastructure.

The service is built with **Node.js** and **Express** and provides HTTP endpoints that retrieve map resources from CARTO Basemaps and cache them in a **MySQL** database.

When a requested tile or font resource already exists in the database, the service returns the cached data directly. If the resource is not available, the service downloads it from the configured upstream CARTO endpoint, stores it in the database, and then returns it to the client.

This approach reduces repeated requests to the upstream map resource provider and provides a centralized backend layer for map resource delivery.

---

## Table of Contents

* [Overview](#overview)
* [How It Works](#how-it-works)
* [Architecture](#architecture)
* [Features](#features)
* [Technology Stack](#technology-stack)
* [API Endpoints](#api-endpoints)
* [Tile Endpoint](#tile-endpoint)
* [Font Endpoint](#font-endpoint)
* [Caching Strategy](#caching-strategy)
* [Requirements](#requirements)
* [Installation](#installation)
* [Environment Configuration](#environment-configuration)
* [Database Configuration](#database-configuration)
* [Running Locally](#running-locally)
* [Production Build and Deployment](#production-build-and-deployment)
* [Vercel Deployment](#vercel-deployment)
* [Project Structure](#project-structure)
* [Error Handling](#error-handling)
* [Security](#security)
* [Testing](#testing)
* [Contributing](#contributing)
* [License](#license)

---

## Overview

Meli MAP Backend acts as a lightweight map resource proxy and caching service.

The backend currently provides two main resource types:

1. **Vector map tiles**
2. **Map font resources**

The service follows a cache-first strategy:

```text
Client
   │
   │ GET /tiles/:zoom/:x/:y
   │ GET /fonts/:fontStack/:fontRange
   ▼
Meli MAP Backend
   │
   ▼
Check MySQL Cache
   │
   ├─────────────── Resource Found ───────────────► Return Cached Data
   │
   │
   └─────────────── Resource Missing
                         │
                         ▼
                  Request CARTO
                         │
                         ▼
                   Receive Resource
                         │
                         ▼
                    Save to MySQL
                         │
                         ▼
                    Return Resource
```

---

## How It Works

For every tile or font request, the backend first checks the MySQL database.

### If the resource exists

The backend returns the stored binary data directly.

### If the resource does not exist

The backend:

1. Builds the upstream CARTO resource URL.
2. Sends an HTTP request using Axios.
3. Receives the resource as binary data.
4. Stores the resource in MySQL.
5. Queries the newly stored resource.
6. Returns the binary data to the client.

This mechanism allows frequently requested map resources to be served from the local database after their first retrieval.

---

## Architecture

The current application is intentionally lightweight and consists of three main layers:

```text
┌─────────────────────────┐
│        Map Client       │
│  Web / Mobile / Map UI  │
└────────────┬────────────┘
             │
             │ HTTP
             ▼
┌─────────────────────────┐
│    Express Backend     │
│                         │
│  /tiles/:z/:x/:y        │
│  /fonts/:stack/:range   │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
┌────────────┐ ┌───────────────┐
│   MySQL    │ │ CARTO Basemaps│
│   Cache    │ │   Upstream    │
└────────────┘ └───────────────┘
```

### Main Components

#### Express

Handles HTTP requests and exposes the map resource endpoints.

#### Axios

Downloads missing tiles and font resources from the upstream CARTO endpoints.

#### MySQL

Stores downloaded binary resources and acts as the persistent cache.

#### CORS

The application enables CORS middleware to allow requests from external clients.

#### Vercel

The repository includes a Vercel configuration using the Node.js runtime adapter.

---

## Features

* Vector tile delivery
* Map font delivery
* Database-backed resource caching
* Automatic upstream resource retrieval
* Persistent caching using MySQL
* Automatic MySQL connection retry handling
* Database connection loss handling
* CORS support
* Axios-based upstream requests
* Vercel deployment configuration

---

## Technology Stack

| Technology | Purpose                             |
| ---------- | ----------------------------------- |
| Node.js    | JavaScript runtime                  |
| Express.js | HTTP server and API framework       |
| Axios      | Upstream HTTP requests              |
| MySQL      | Persistent tile and font cache      |
| CORS       | Cross-origin request support        |
| Vercel     | Serverless deployment configuration |

The project dependencies are defined in `package.json`.

---

## API Endpoints

The backend currently exposes two primary endpoints.

| Method | Endpoint                       | Description                  |
| ------ | ------------------------------ | ---------------------------- |
| `GET`  | `/tiles/:zoom/:x/:y`           | Retrieve a vector map tile   |
| `GET`  | `/fonts/:fontStack/:fontRange` | Retrieve a map font resource |

---

## Tile Endpoint

### Request

```http
GET /tiles/:zoom/:x/:y
```

### Parameters

| Parameter | Description       |
| --------- | ----------------- |
| `zoom`    | Map zoom level    |
| `x`       | Tile X coordinate |
| `y`       | Tile Y coordinate |

### Example

```http
GET /tiles/10/684/412
```

The backend first checks whether the requested tile exists in the database.

If the tile is available:

```text
MySQL
  │
  ▼
Cached Tile
  │
  ▼
HTTP Response
```

If the tile does not exist:

```text
Client
  │
  ▼
Backend
  │
  ▼
CARTO Basemaps
  │
  ▼
Download .mvt
  │
  ▼
Store in MySQL
  │
  ▼
Return Tile
```

The upstream tile source currently follows the CARTO vector tile URL pattern:

```text
https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{zoom}/{x}/{y}.mvt
```

---

## Font Endpoint

### Request

```http
GET /fonts/:fontStack/:fontRange
```

### Parameters

| Parameter   | Description          |
| ----------- | -------------------- |
| `fontStack` | Requested font stack |
| `fontRange` | Requested font range |

### Example

```http
GET /fonts/Noto%20Sans%20Regular/0-255
```

The backend checks the database first.

If the font is already cached, it is returned directly.

If the font is missing, the backend retrieves it from the configured CARTO font endpoint, stores it in MySQL, and returns the downloaded resource.

The upstream resource follows the pattern:

```text
https://tiles.basemaps.cartocdn.com/fonts/{fontStack}/{fontRange}.pbf
```

---

## Caching Strategy

The service implements a persistent cache for map resources.

### Cache Lookup

The backend checks the database before making an external request.

### Cache Hit

```text
Request
   │
   ▼
MySQL
   │
   ▼
Resource Found
   │
   ▼
Return Binary Data
```

### Cache Miss

```text
Request
   │
   ▼
MySQL
   │
   ▼
Resource Not Found
   │
   ▼
Request Upstream Resource
   │
   ▼
Store Binary Data
   │
   ▼
Return Resource
```

This strategy minimizes repeated upstream downloads for resources that have already been requested.

---

## Requirements

Before running the application locally, make sure the following are installed:

* Node.js
* npm
* MySQL
* Git

Check your installed versions:

```bash
node -v
```

```bash
npm -v
```

```bash
mysql --version
```

The application currently uses the Node.js packages defined in `package.json`.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/iranpsc/Meli-MAP-backend.git
```

Navigate into the project:

```bash
cd Meli-MAP-backend
```

Install dependencies:

```bash
npm install
```

---

## Environment Configuration

The application should use environment variables for all environment-specific and sensitive configuration.

Create a `.env` file:

```env
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

> **Important:** Never commit `.env` files or database credentials to the repository.

The database credentials currently present directly in the source code should be removed and rotated before production use.

The recommended implementation is to load configuration from environment variables rather than hard-coding credentials in `index.js`.

---

## Database Configuration

The backend expects a MySQL database containing storage for map tiles and font resources.

The application currently queries tables with the following logical structures:

### Tiles

```text
tiles
├── zoom
├── x
├── y
└── data
```

### Fonts

```text
fonts
├── name
├── font_range
└── data
```

The `data` columns must support binary resource storage.

A production database should use appropriate indexes for frequently queried fields.

Recommended tile lookup index:

```text
(zoom, x, y)
```

Recommended font lookup index:

```text
(name, font_range)
```

> The exact database schema should be managed through version-controlled SQL migrations or schema documentation rather than relying on manually configured production databases.

---

## Running Locally

Start the backend:

```bash
node index.js
```

The application currently listens on:

```text
http://localhost:3001
```

You should see a message similar to:

```text
Server is running on port 3001
```

If the database connection is successful, the application also reports the MySQL connection status.

---

## Testing the API

After starting the server, request a tile:

```bash
curl http://localhost:3001/tiles/10/684/412
```

Request a font resource:

```bash
curl http://localhost:3001/fonts/Noto%20Sans%20Regular/0-255
```

The first request for a missing resource may trigger an upstream download and database insertion.

Subsequent requests should be served from the database cache.

---

## Production Build and Deployment

The project is a Node.js backend and does not require a traditional frontend build step.

Install production dependencies:

```bash
npm install --omit=dev
```

Start the application:

```bash
node index.js
```

The production environment should provide:

* Node.js runtime
* MySQL database
* Environment variables
* Network access to the upstream CARTO resources

---

## Vercel Deployment

The repository includes a `vercel.json` configuration that routes requests to `index.js` using the Vercel Node.js runtime.

The deployment configuration follows this model:

```text
Client Request
      │
      ▼
Vercel
      │
      ▼
index.js
      │
      ├───────────────┐
      ▼               ▼
    MySQL          CARTO
   Database       Basemaps
```

Before deploying to Vercel, configure all required environment variables in the Vercel project settings.

> The database must be reachable from the deployed environment. A database running only on `127.0.0.1` of a local development machine cannot be accessed by a remote Vercel deployment.

---

## Error Handling

The application handles several common failure scenarios.

### Database Query Failure

Returns:

```http
500 Internal Server Error
```

### Resource Not Found After Download

Returns:

```http
404 Tile not found
```

or:

```http
404 Font not found
```

### Upstream Download Failure

The application logs the error and does not successfully cache the requested resource.

For production deployments, error handling and observability should be extended with structured logging and centralized monitoring.

---

## Database Connection Reliability

The application includes connection retry behavior for MySQL.

If the initial database connection fails, the application retries the connection after a short delay.

The application also listens for database connection errors and attempts to reconnect when a fatal connection loss occurs.

This behavior helps the service recover from transient database connectivity problems.

---

## Security

Security is critical for this backend because it connects to a database and exposes network endpoints.

### Never Commit Credentials

Database credentials must never be hard-coded in source code.

Use environment variables:

```env
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_NAME=
```

### Rotate Exposed Credentials

If credentials have ever been committed to a public repository:

1. Immediately rotate the credentials.
2. Remove the credentials from the source code.
3. Review repository history if necessary.
4. Check whether the credentials were accessed.
5. Update the deployment environment.

### Validate Request Parameters

Tile coordinates and font parameters should be validated before database queries or upstream requests.

### Restrict CORS

The current application enables CORS globally.

For production, configure CORS to allow only trusted origins whenever possible.

### Rate Limiting

Production deployments should consider rate limiting to protect the service from excessive requests.

---

## Testing

The current repository does not include a dedicated automated test suite.

For future development, automated tests should be introduced for the core functionality.

Recommended test coverage includes:

### Tile API

* Returns cached tile.
* Downloads missing tile.
* Stores downloaded tile.
* Returns downloaded tile.
* Handles database errors.
* Handles upstream download failures.
* Returns `404` when a tile cannot be retrieved.

### Font API

* Returns cached font.
* Downloads missing font.
* Stores downloaded font.
* Returns downloaded font.
* Handles database errors.
* Handles upstream download failures.
* Returns `404` when a font cannot be retrieved.

### Database

* Connection success.
* Connection failure.
* Connection retry.
* Connection loss recovery.

---

## Project Structure

The current repository is intentionally small:

```text
Meli-MAP-backend/
│
├── .github/
│
├── index.js
├── index.js.save
│
├── package.json
├── package-lock.json
│
├── vercel.json
│
├── .gitignore
├── CODE_OF_CONDUCT.md
├── LICENSE
├── SECURITY.md
└── README.md
```

### `index.js`

Main Express application containing:

* Express initialization
* CORS configuration
* MySQL connection
* Tile endpoint
* Font endpoint
* CARTO resource downloading
* Database caching
* HTTP server startup

### `package.json`

Defines the Node.js dependencies used by the backend.

### `vercel.json`

Defines the Vercel deployment configuration.

---

## Development Workflow

The recommended workflow is:

```text
Issue / Task
     │
     ▼
Create Branch
     │
     ▼
Implement Change
     │
     ▼
Add / Update Tests
     │
     ▼
Run Local Validation
     │
     ▼
Commit Changes
     │
     ▼
Open Pull Request
     │
     ▼
CI Checks
     │
     ▼
Code Review
     │
     ▼
Merge
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution requirements.

---

## Contributing

Contributions are welcome.

Before contributing, please read:

[`CONTRIBUTING.md`](CONTRIBUTING.md)

All contributions should:

* Follow the project's coding conventions.
* Include tests for new behavior where applicable.
* Avoid introducing security vulnerabilities.
* Avoid committing credentials.
* Keep Pull Requests focused.
* Pass required CI checks.

---

## Security Reporting

If you discover a security vulnerability, please do not report it through a public GitHub Issue.

Follow the security reporting process described in:

[`SECURITY.md`](SECURITY.md)

---

## License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for the complete license text.

---

## Project Status

The project is currently under active development.

The backend provides the core functionality required to retrieve, cache, and serve map tiles and font resources.

Future improvements may include:

* Automated test coverage
* Environment-based configuration
* Database schema migrations
* Request validation
* Rate limiting
* Structured logging
* Improved error handling
* Health check endpoint
* API documentation
* Monitoring and observability
* Cache management
* Improved database indexing

---

## Maintainers

Maintained by the **Metaverse Rang** development team.

Repository:

https://github.com/iranpsc/Meli-MAP-backend
