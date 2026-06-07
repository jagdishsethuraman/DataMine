# DataMine 📊

DataMine is a local web application designed for high-performance data exploration, custom SQL queries, and dynamic visualizations on large (gigabyte-scale) CSV and Parquet repositories.

Built with **FastAPI**, **DuckDB**, and **React**, DataMine avoids memory overheads (RAM crashes) by executing queries directly on disk or through memory mapping using a high-performance, out-of-core SQL engine.

---

## Key Features

1. **Analytical SQL Editor**: Write custom SQL directly in the browser (e.g. filters, aggregations, joins). The query targets a virtual table called `table` representing the selected CSV or Parquet file.
2. **Preset Templates**: Click-to-apply templates for quick data analysis:
   - **Preview**: Standard preview showing columns.
   - **Group By Count**: Frequency counts on text columns.
   - **Value Sum**: Financial/sales sum aggregations on numeric columns.
   - **Time Series**: Daily/monthly rolling stats.
3. **Advanced Visualizations (Recharts)**:
   - Supports **Line**, **Bar**, **Area**, **Scatter**, and **Pie** charts.
   - Bind X-Axis dynamically to any query field.
   - **Multi-Series Plotting**: Toggle multiple Y-Axis series at once to overlay them.
4. **Local Repository Manager**:
   - Drag & drop uploader for new CSV and Parquet files.
   - Check file sizes and format states in a dedicated manager catalog.
5. **Parquet Optimization Engine**:
   - Convert large CSV files to compressed Parquet format with a single click.
   - Reduces file size on disk and increases query performance by 10x to 50x.
6. **Data Exporter**: Save custom query outputs back to your machine as a CSV download with one click.
7. **Schema Dictionary**: A side-panel showing column schemas and types. Click any column name to copy it.

---

## Technical Architecture

- **Backend**: FastAPI (Python)
- **Database Engine**: DuckDB (in-process analytical column-store database)
- **Frontend**: React + Vite (Javascript)
- **Styling**: Premium Vanilla CSS (Custom glassmorphism & gradients, no Tailwind dependency)
- **Charts**: Recharts (dynamic SVGs)

---

## Local Setup & Run Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup & Run Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Initialize virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn duckdb pandas python-multipart
   ```
4. Run the API server:
   ```bash
   uvicorn main:app --port 8000 --reload
   ```

### Setup & Run Frontend

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev -- --port 5173
   ```

4. Open **http://localhost:5173** in your web browser to explore.
