# Changelog

All notable changes to the **DataMine** project are documented here.

---

## [0.2.0] - 2026-06-07

### Added
- **Repository Management Tab**:
  - Drag-and-drop file uploader accepting `.csv` and `.parquet` formats.
  - Interactive table listing datasets, size metrics, and format metadata.
- **CSV-to-Parquet Converter**:
  - One-click file optimization using DuckDB's native columnar writing.
  - Replaces source CSVs with compressed Parquet files and updates index references.
- **SQL Editor & Presets**:
  - Textarea for typing SQL statement blocks.
  - Query presets (Preview, Group By, Sum, Time Series) for fast schema querying.
  - Database compilation error logs mapped to a UI alert banner.
- **Advanced Visualizer**:
  - Multi-series plotting (overlays multiple line, bar, area charts).
  - Selectable chart configurations: X-Axis dropdown, dynamic toggle pills, and custom SVG gradient glows.
  - Added **Scatter** and **Pie/Donut** charts.
- **CSV Export Downloader**:
  - Frontend client-side Blob generation for downloading query results as standard `.csv` files.
- **Project Documentation**:
  - Created `README.md`, `CHANGELOG.md`, and `ARCHITECTURE.md`.

### Changed
- Replaced global DuckDB cursor locks in FastAPI backend with request-scoped local cursors (`con.cursor()`) to fix multi-client concurrency race conditions.
- Upgraded dataset endpoint to return file metadata object payloads.

---

## [0.1.0] - 2026-06-07

### Added
- **Initial Setup**:
  - Created FastAPI Python backend integrating DuckDB database connection.
  - Added REST APIs for `/datasets` listing, `/schema` reading, and `/query` execution.
  - Configured Vite + React development environment on frontend.
- **Bespoke Glassmorphism Design**:
  - Created custom CSS tokens, backdrop filters, and neon-highlight states.
- **Initial Preview UI**:
  - Single dataset dropdown, hardcoded preview line charts, and query data tables.
