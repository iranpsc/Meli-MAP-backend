<div align="center">

# 🌍 Meli-MAP Backend (MetaRang Spatial Engine)
### High-Performance, Self-Hosted 3D Vector Tile & Spatial Data Server for the MetaRang Ecosystem

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Organization](https://img.shields.io/badge/Org-iranpsc-00E5FF.svg)](https://github.com/iranpsc)
[![Architecture](https://img.shields.io/badge/Mode-100%25_Offline_Local-success.svg)](#)
[![Max Zoom](https://img.shields.io/badge/Vector_Zoom-Level_20-purple.svg)](#)

**[🌐 English Documentation](#english-documentation) | [🇮🇷 مستندات فارسی](#persian-documentation)**

</div>

---

<a name="english-documentation"></a>
## 🌐 English Documentation

### 1. Overview
**Meli-MAP Backend** (`iranpsc/Meli-MAP-backend`) is the core geospatial data and vector tile serving infrastructure for **MetaRang (Metaverse Rang)**, developed under **Paradise Supply Chain Holding (`iranpsc`)**.

This repository is engineered to operate with **zero external API dependencies**. All cartographic assets, vector tiles (up to Zoom Level 20), boundary polygons, fonts, sprites, and populated place registries are stored, indexed, and served directly from local server storage. This ensures 100% uptime, ultra-low latency, and complete operational resilience during international network disruptions.

### 2. Key Architectural Features
* **Zero External API Dependency (Offline-First):** Completely eliminates runtime calls to third-party map providers. All spatial queries, tile requests, and geocoding tasks are resolved locally on-premise.
* **High-Resolution Vector Tiles (Zoom 0–20):** Serves optimized Protobuf (`.pbf` / `.mvt`) vector tiles via `PMTiles` / `MBTiles` archives, delivering granular urban details down to street alleys and land parcels at Zoom Level 20.
* **3D Globe Ready (Lightweight Vector Stream):** Specifically tuned to feed modern 3D Globe WebGL frontends with clean 2D/3D vector footprints, intentionally excluding heavy 3D building meshes and terrain elevation models to maximize rendering performance.
* **Immutable Read-Only Serving Layer:** Designed without public crowd-sourcing or live citizen map-editing endpoints, guaranteeing database integrity, security, and aggressive caching efficiency.
* **Sustainable Annual Spatial Data Refresh:** Built for scheduled, maintainable development. Map data updates are executed annually via structured GitHub Issues by GIS specialists using automated ingestion and tile-generation pipelines.

---

### 3. System Architecture & Data Pipeline

```text
[Raw GIS Sources: .osm.pbf / .gpkg / .geojson]
                     │
      (Annual Ingestion & Tile Pipeline)
                     ▼
   ┌───────────────────────────────────┐
   │      Local Storage & Indexing     │
   ├─────────────────┬─────────────────┤
   │ PMTiles/MBTiles │  PostGIS + Redis│
   │ (Vector Tiles)  │ (Spatial Search)│
   └────────┬────────┴────────┬────────┘
            │                 │
            ▼                 ▼
   ┌───────────────────────────────────┐
   │     Meli-MAP Backend API Core     │
   │  /tiles/{z}/{x}/{y}.pbf | /search │
   └─────────────────┬─────────────────┘
                     │
                     ▼
      [Meli-MAP 3D Globe Frontend]
```

---

### 4. Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tiles/{z}/{x}/{y}.pbf` | Streams compressed vector tiles (Zoom `0` to `20`) directly from local archives. |
| `GET` | `/api/v1/metadata` | Returns `TileJSON` specification, bounding boxes, and vector layer schemas. |
| `GET` | `/api/v1/fonts/{fontstack}/{range}.pbf` | Serves local SDF glyph ranges for offline map typography (Persian/Multi-language). |
| `GET` | `/api/v1/sprites/{sprite}.json` | Serves local vector icons and map markers sprite sheets (`.json` & `.png`). |
| `GET` | `/api/v1/geocode/search` | Executes local spatial search across populated places, streets, and parcels. |
| `GET` | `/api/v1/geocode/reverse` | Performs offline reverse geocoding (`lat`, `lng` to structured address). |
| `GET` | `/api/v1/health` | Returns server status, active map dataset version, and storage metrics. |

---

### 5. Directory Structure

```text
Meli-MAP-backend/
├── cmd/                    # Application entrypoints & CLI tools for data ingestion
├── config/                 # Environment configurations & tile server rules
├── data/                   # Local mount point for offline map assets (Git-ignored)
│   ├── tiles/              # Local .pmtiles / .mbtiles vector archives (Zoom 0-20)
│   ├── glyphs/             # Local PBF font stacks (RTL Persian & Latin)
│   ├── sprites/            # Map icons and texture atlases
│   └── gpkg/               # Raw GeoPackage & CSV spatial datasets for PostGIS
├── internal/               # Core backend packages (Tile reader, Spatial queries, Cache)
├── scripts/                # Automation scripts for annual tile generation & DB migration
├── docker-compose.yml      # Self-hosted container orchestration (Backend, PostGIS, Redis)
└── README.md               # Bilingual repository documentation
```

---

### 6. Installation & Local Deployment

#### Prerequisites
* **Docker** & **Docker Compose** (Managed via Dokploy or standalone Linux server)
* Local storage volume with sufficient NVMe SSD capacity for Zoom 20 vector archives
* Tools for annual data preparation: `tilemaker` / `tippecanoe`, `gdal` (`ogr2ogr`), and `pmtiles` CLI

#### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/iranpsc/Meli-MAP-backend.git
cd Meli-MAP-backend

# 2. Configure environment variables
cp .env.example .env

# 3. Place compiled local map files into the data directory
# Ensure your .pmtiles / .mbtiles, glyphs, and sprites are placed inside ./data/

# 4. Launch the self-hosted stack
docker compose up -d --build
```

---

### 7. Annual Local Map Update Workflow (GIS Specialist Guide)
To ensure sustainable development without live third-party dependencies, map datasets are updated on an **annual schedule** (or on-demand via official releases):

1. **Open an Update Issue:** A GIS specialist creates an Issue in `iranpsc/Meli-MAP-backend` using the title format `[MapData-YYYY] Annual Local Map Update`.
2. **Dataset Preparation:** Download and validate the latest national/global `.osm.pbf` and `.gpkg` spatial layers (including parcels, street networks, and populated places up to Zoom 20, stripping 3D building extrusions).
3. **Tile Compilation & Indexing:** Generate the updated `.pmtiles` / `.mbtiles` archive, prepare PostGIS spatial dump files, and compute `SHA-256` checksums.
4. **Zero-Downtime Swap:** Upload the new archive to the server's `/data/tiles/` volume, update the dataset version tag in `.env`, and trigger a graceful container reload.

---

### 8. License
Copyright © 2021–2026 **Paradise Supply Chain Holding (شرکت تعاونی زنجیره تامین بهشت)** & **MetaRang**.  
This project is open-source software licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

---
---

<div dir="rtl">

<a name="persian-documentation"></a>
## 🇮🇷 مستندات فارسی (Persian Documentation)

### ۱. معرفی پروژه
مخزن **Meli-MAP Backend** (`iranpsc/Meli-MAP-backend`) هسته مرکزی و زیرساخت بک‌اند **سامانه نقشه ملی و نقشه متارنگ (متاورس رنگ)** تحت نظارت **هلدینگ زنجیره تامین بهشت (`iranpsc`)** است.

هدف اصلی این مخزن، ایجاد یک زیرساخت نقشه **کاملاً مستقل، لوکال و بدون نیاز به هیچ‌گونه API خارجی** است. تمامی فایل‌های نقشه، تایل‌های برداری (Vector Tiles)، فونت‌ها، آیکون‌ها، مرزها و پایگاه داده نقاط جغرافیایی به صورت یکجا در سرور قرار گرفته و مستقیماً از روی دیسک‌های پرسرعت سرور داخلی خوانده می‌شوند. این معماری تضمین می‌کند که نقشه متارنگ بدون وابستگی به اینترنت بین‌الملل یا سرویس‌های ثالث، با بالاترین سرعت و پایداری ۱۰۰٪ سرویس‌دهی کند.

---

### ۲. ویژگی‌های کلیدی و معماری
* **استقلال کامل از APIهای خارجی (100% Local & Offline-First):** حذف کامل درخواست‌های شبکه به سرورهای نقشه خارجی در زمان اجرا؛ تمامی فرآیندهای واکشی تایل و جستجوی مکانی به صورت لوکال از روی سرور داخلی انجام می‌شود.
* **پشتیبانی از جزئیات دقیق تا زوم ۲۰ (Zoom Level 20):** سروینگ فوق‌سریع تایل‌های برداری (`.pbf` / `.mvt`) از نمای کلی کره زمین تا دقیق‌ترین جزئیات شهری شامل کوچه‌ها، معابر فرعی و قطعات زمین (Parcels) در سطح زوم ۲۰.
* **بهینه‌سازی شده برای نمایش کره سه‌بعدی (3D Globe Ready):** ارسال داده‌های برداری سبک و مدرن متناسب با گرافیک سه‌بعدی فرانت‌اند، بدون بارگذاری مدل‌های سنگین سه‌بعدی ساختمان‌ها و عوارض حجمی زمین جهت حفظ حداکثر سرعت رندرینگ و بهینگی مصرف منابع.
* **معماری خواندنی و پایدار (Read-Only Core):** عدم وجود قابلیت ویرایش عمومی نقشه توسط کاربران که موجب امنیت کامل داده‌ها، حذف سربار تراکنش‌های نوشتن و امکان کشینگ حداکثری در سطح سرور می‌شود.
* **توسعه پایدار و بروزرسانی سالانه مبتنی بر Issue:** قابلیت ارتقا و بروزرسانی دوره‌ای فایل‌های لوکال نقشه به صورت سالانه توسط متخصصین GIS از طریق ثبت Issue استاندارد در گیت‌هاب.

---

### ۳. اندپوینت‌های اصلی سرویس (API Endpoints)

| متد | مسیر (Endpoint) | توضیحات عملکرد |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tiles/{z}/{x}/{y}.pbf` | واکشی مستقیم تایل‌های برداری فشرده (از زوم `0` تا `20`) از آرشیو لوکال سرور. |
| `GET` | `/api/v1/metadata` | دریافت فایل مشخصات `TileJSON`، محدوده مختصات و ساختار لایه‌های برداری. |
| `GET` | `/api/v1/fonts/{fontstack}/{range}.pbf` | ارائه لوکال فونت‌های برداری نقشه (پشتیبانی کامل از برچسب‌های فارسی و چندزبانه). |
| `GET` | `/api/v1/sprites/{sprite}.json` | ارائه لوکال آیکون‌ها و نشانگرهای گرافیکی نقشه (`.json` و `.png`). |
| `GET` | `/api/v1/geocode/search` | جستجوی مکانی لوکال (Geocoding) بر روی پایگاه داده شهرها، معابر و نقاط جمعیتی. |
| `GET` | `/api/v1/geocode/reverse` | تبدیل مختصات جغرافیایی به آدرس متنی به صورت کاملاً آفلاین (Reverse Geocoding). |
| `GET` | `/api/v1/health` | بررسی وضعیت سلامت سرور، نسخه دیتاست فعال نقشه و وضعیت فضای ذخیره‌سازی. |

---

### ۴. ساختار پوشه‌ها و فایل‌ها

* **`cmd/`**: نقطه ورود اصلی برنامه و ابزارهای خط فرمان (CLI) جهت ایمپورت داده‌های مکانی.
* **`config/`**: تنظیمات محیطی سرور، قوانین کشینگ و پیکربندی لایه‌های تایل.
* **`data/`**: محل قرارگیری فایل‌های لوکال نقشه بر روی سرور (این پوشه در Git نادیده گرفته می‌شود و روی Volume سرور مونت می‌گردد):
  * `data/tiles/`: آرشیوهای تایل برداری با فرمت `.pmtiles` یا `.mbtiles` (زوم ۰ تا ۲۰).
  * `data/glyphs/`: فونت‌های کامپایل شده `.pbf` برای رندر متون فارسی و انگلیسی.
  * `data/sprites/`: فایل‌های استایل آیکون‌ها و علائم نقشه.
  * `data/gpkg/`: فایل‌های دیتابیس مکانی (`GeoPackage` و `CSV`) برای بارگذاری در PostGIS.
* **`internal/`**: ماژول‌های داخلی بک‌اند شامل موتور خوانش تایل از دیسک، سرویس جستجوی مکانی و لایه کش Redis.
* **`scripts/`**: اسکریپت‌های اتوماسیون جهت تبدیل فایل‌های خام نقشه و بروزرسانی سالانه دیتابیس.

---

### ۵. راه‌اندازی و استقرار لوکال (Deployment)

```bash
# ۱. دریافت مخزن پروژه
git clone https://github.com/iranpsc/Meli-MAP-backend.git
cd Meli-MAP-backend

# ۲. تنظیم متغیرهای محیطی (مسیر فایل‌های لوکال نقشه و دیتابیس)
cp .env.example .env

# ۳. قرار دادن فایل‌های آرشیو نقشه لوکال (.pmtiles / .mbtiles) در مسیر ./data/tiles/

# ۴. اجرای سرویس‌ها با Docker Compose
docker compose up -d --build
```

---

### ۶. گردش کار بروزرسانی سالانه نقشه (راهنمای متخصص GIS)
از آنجا که زیرساخت نقشه متارنگ بر پایه فایل‌های لوکال و بدون وابستگی به APIهای بیرونی بنا شده است، فرآیند بروزرسانی داده‌های جغرافیایی جهت توسعه پایدار طبق چرخه سالانه زیر انجام می‌گیرد:

1. **ثبت Issue بروزرسانی:** متخصص مربوطه یک Issue جدید با عنوان `[MapData-YYYY] بروزرسانی سالانه فایل‌های لوکال نقشه متارنگ` و برچسب `annual-map-update` در مخزن ایجاد می‌کند.
2. **آماده‌سازی و کامپایل داده‌های لوکال:** آخرین داده‌های جغرافیایی (شامل فایل‌های `.osm.pbf` و لایه‌های `.gpkg` نقاط جمعیتی، معابر و قطعات زمین) دریافت شده و پس از پالایش لایه‌های غیرضروری (مانند حجم‌های سه‌بعدی ساختمان‌ها)، تا سطح **زوم ۲۰** به فرمت یکپارچه `.pmtiles` یا `.mbtiles` کامپایل می‌شوند.
3. **بروزرسانی دیتابیس جستجو:** جداول جستجوی مکانی لوکال (PostGIS) از روی فایل‌های جدید بروزرسانی شده و کد کنترلی (`SHA-256`) فایل‌های خروجی ثبت می‌گردد.
4. **جایگزینی بدون قطعی (Zero-Downtime Swap):** فایل‌های آرشیو جدید در مسیر `/data/tiles/` سرور بارگذاری شده و نسخه دیتاست در فایل `.env` به سال جدید تغییر می‌یابد تا سرور بدون وقفه از نقشه جدید استفاده کند.

---

### ۷. مجوز (License)
تمامی حقوق مادی و معنوی این اثر متعلق به **شرکت تعاونی زنجیره تامین بهشت (Paradise Supply Chain Holding)** و **پروژه متارنگ (MetaRang)** می‌باشد.  
این نرم‌افزار به صورت متن‌باز و تحت مجوز بین‌المللی **GNU Affero General Public License v3.0 (AGPL-3.0)** منتشر شده است.

</div>
