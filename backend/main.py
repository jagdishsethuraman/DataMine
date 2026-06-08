from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import duckdb
import os
import glob
import time
import shutil

app = FastAPI(title="DataMine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Connect to in-memory DuckDB
con = duckdb.connect(database=':memory:', read_only=False)

class QueryRequest(BaseModel):
    query: str

@app.get("/")
def read_root():
    return {"message": "Welcome to DataMine API"}

@app.get("/datasets")
def list_datasets():
    """List all CSV and Parquet files in the data directory with metadata."""
    csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    parquet_files = glob.glob(os.path.join(DATA_DIR, "*.parquet"))
    
    datasets = []
    for f in csv_files + parquet_files:
        try:
            stat = os.stat(f)
            name = os.path.basename(f)
            fmt = "Parquet" if f.endswith(".parquet") else "CSV"
            datasets.append({
                "name": name,
                "size_bytes": stat.st_size,
                "format": fmt
            })
        except Exception:
            continue
            
    # Sort files: Parquet first, then name
    datasets.sort(key=lambda x: (x["format"] != "Parquet", x["name"]))
    return {"datasets": datasets}

@app.get("/schema/{dataset_name}")
def get_schema(dataset_name: str):
    """Get the schema (columns and types) for a given CSV or Parquet file."""
    file_path = os.path.join(DATA_DIR, dataset_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        cursor = con.cursor()
        # Handle read command based on file extension
        read_func = "read_parquet" if dataset_name.endswith(".parquet") else "read_csv_auto"
        result = cursor.execute(f"DESCRIBE SELECT * FROM {read_func}('{file_path}')").df()
        schema = result.to_dict(orient="records")
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/query/{dataset_name}")
def query_dataset(dataset_name: str, req: QueryRequest):
    """Execute a custom SQL query on the dataset.
    Register all repository CSV and Parquet files as temporary views in DuckDB
    so that they can be referenced and joined directly in standard SQL statements.
    Example: SELECT * FROM Walmart JOIN sample ON Walmart.product_id = sample.id
    """
    active_path = os.path.join(DATA_DIR, dataset_name)
    if not os.path.exists(active_path):
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    start_time = time.time()
    try:
        cursor = con.cursor()
        
        # Load Parquet extension
        try:
            cursor.execute("INSTALL parquet; LOAD parquet;")
        except Exception:
            pass
            
        # 1. Scan files and register views using cleaned table names
        csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
        parquet_files = glob.glob(os.path.join(DATA_DIR, "*.parquet"))
        for f in csv_files + parquet_files:
            fname = os.path.basename(f)
            # Remove extension and clean names (replace hyphen and dot with underscores)
            clean_name = os.path.splitext(fname)[0].replace("-", "_").replace(".", "_")
            read_func = "read_parquet" if f.endswith(".parquet") else "read_csv_auto"
            
            # Create view for this file
            cursor.execute(f'CREATE OR REPLACE VIEW "{clean_name}" AS SELECT * FROM {read_func}(\'{f}\')')
            
        # 2. Also register the active dataset as 'table' view for backward compatibility
        active_read_func = "read_parquet" if active_path.endswith(".parquet") else "read_csv_auto"
        cursor.execute(f'CREATE OR REPLACE VIEW "table" AS SELECT * FROM {active_read_func}(\'{active_path}\')')
        
        # 3. Execute user query directly
        df = cursor.execute(req.query).df()
        execution_time_ms = round((time.time() - start_time) * 1000, 2)
        
        # Convert NaN/NaT to None for JSON serialization
        df = df.where(df.notnull(), None)
        return {
            "data": df.to_dict(orient="records"),
            "execution_time_ms": execution_time_ms
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/upload")
def upload_file(file: UploadFile = File(...)):
    """Upload a CSV or Parquet file."""
    if not (file.filename.endswith(".csv") or file.filename.endswith(".parquet")):
        raise HTTPException(status_code=400, detail="Only CSV and Parquet files are supported")
        
    file_path = os.path.join(DATA_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"message": f"Successfully uploaded {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert/{dataset_name}")
def convert_to_parquet(dataset_name: str):
    """Convert a CSV file to Parquet format and delete the original."""
    if not dataset_name.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files can be converted to Parquet")
        
    csv_path = os.path.join(DATA_DIR, dataset_name)
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    parquet_name = dataset_name.rsplit(".", 1)[0] + ".parquet"
    parquet_path = os.path.join(DATA_DIR, parquet_name)
    
    try:
        cursor = con.cursor()
        try:
            cursor.execute("INSTALL parquet; LOAD parquet;")
        except Exception:
            pass
            
        cursor.execute(f"COPY (SELECT * FROM read_csv_auto('{csv_path}')) TO '{parquet_path}' (FORMAT PARQUET)")
        
        # Remove original CSV file
        os.remove(csv_path)
        return {"message": f"Successfully converted {dataset_name} to Parquet", "new_name": parquet_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
