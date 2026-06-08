# DataMine Project Roadmap 🚀

This document outlines the milestones, completed phases, and upcoming features planned for the **DataMine** workspace.

---

## Phase 1: Engine & API Foundation (Completed)
- [x] Configure Python environment and install FastAPI, Uvicorn, and DuckDB.
- [x] Setup datasets API to dynamically inspect the data folder.
- [x] Integrate request-scoped thread-local database cursors (`con.cursor()`) to resolve concurrent request collisions.
- [x] Initialize frontend layout with React and Vite.

## Phase 2: Workspace & Basic Visualizer (Completed)
- [x] Build custom CSS dark theme design tokens.
- [x] Implement the Query Results preview table with null value formats.
- [x] Create presets templates (Preview, Group By, Sum, Time Series).
- [x] Implement multi-series line, bar, area, scatter, and pie charts using Recharts.

## Phase 3: Catalog Manager & Parquet Optimizer (Completed)
- [x] Create file upload multipart parser (`python-multipart`).
- [x] Implement dropzone uploading form in the React client.
- [x] Build one-click Parquet compiler utilizing DuckDB's native columnar writing:
  `COPY (SELECT * FROM read_csv_auto('file.csv')) TO 'file.parquet' (FORMAT PARQUET)`
- [x] Auto-purge original CSV files to save local storage and swap dataset links to Parquet.
- [x] Add client-side CSV downloads using Blob streams.

## Phase 4: Material Design 3 Styling (Completed)
- [x] Migrate cards to outlined, elevated M3 panels (`m3-card`) with 16px corner roundings.
- [x] Redesign Navigation Drawer to use capsule-shaped highlights.
- [x] Replace selector dropdowns with M3 Segmented Button groups.
- [x] Verify WCAG AA contrast ratios and input outline focus highlights.

---

## Phase 5: Advanced SQL IDE (In Progress)
- [ ] **Rich Code Editor Integration**:
  - Integrate **CodeMirror** or **Monaco Editor** in place of the default textarea.
  - Provide syntax highlighting for SQL blocks, inline line-number rails, and parentheses matching.
  - Enable keyword autocomplete (e.g. suggesting `SELECT`, `FROM`, `GROUP BY`, column names).
- [ ] **Saved Queries & History**:
  - Add a "Saved Queries" catalog to label and save complex queries (e.g. *"Monthly Revenue Summary"*).
  - Add a scrollable "Query History" panel to easily click and re-run previously executed statements.

## Phase 6: Multi-Dataset Joins & Virtual Views (Upcoming)
- [ ] **Multi-Table Joins**:
  - Register all repository CSV and Parquet files as active DuckDB views simultaneously on start.
  - Support joins in the SQL editor (e.g. `SELECT * FROM sales JOIN users ON sales.user_id = users.id`).
- [ ] **Virtual View Compiler**:
  - Support compiling queries into virtual tables: `CREATE VIEW view_name AS ...`
  - Display user-created views in the Schema Dictionary alongside active files so views can be sub-queried.

## Phase 7: Deployment & Multi-User Support (Upcoming)
- [ ] Add basic OAuth2 API token authentication to secure local network access.
- [ ] Implement multi-user workspace storage mapping (different files per user session).
- [ ] Add CSV-to-Parquet conversion directly on the upload queue.
