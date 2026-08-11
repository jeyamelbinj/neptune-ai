from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import uuid
import io
import json
import logging

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

router = APIRouter(prefix="/api/sentinel", tags=["Data Sentinel Hub"])
logger = logging.getLogger("NEPTUNE_Nexus")

class DataManager:
    def __init__(self):
        self.datasets = {}
        self.init_mock()
        
    def init_mock(self):
        data = {
            "id": [f"m{str(i)}.zfill(4)" for i in range(1, 11)],
            "title": ["Der Golem", "Shadows of Fate", "La Strada", "Cyber Nexus", "The Last Vector", "Echoes", "Neon Dawn", "Ironclad", "Voidwalker", "Starfall"],
            "year": [2019, 2020, 2019, 2021, 2022, 2020, 2023, 2018, 2021, 2022],
            "duration": [112, 134, 98, 145, 110, 95, 160, 105, 120, 130],
            "country": ["Germany", None, "Italy", "USA", "UK", "Japan", "USA", None, "Canada", "France"],
            "worlwide_gross_income": [1200500, 14500000, None, 88200000, 5000000, None, 120000000, 3000000, 15000000, 8500000]
        }
        df = pd.DataFrame(data)
        df = pd.concat([df, df.iloc[[0]]], ignore_index=True)
        self.datasets["rsvp_movies"] = df
    

    def get_df(self, key: str) -> pd.DataFrame:
        if key not in self.datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return self.datasets[key]

    def clean_df_for_json(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return json.loads(df.to_json(orient="records"))

dm = DataManager()

class ImputeRequest(BaseModel):
    strategy: str = "mode"
    columns: Optional[List[str]] = None

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        filename = file.filename
        ext = filename.rsplit('.', 1)[-1].lower()
        contents = await file.read()
        extracted_text = ""
        is_binary = False

        if ext == 'pdf':
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                for page in pdf.pages[:5]: extracted_text += page.extract_text() or ""
        elif ext in ['csv', 'tsv']:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', errors='ignore')
            extracted_text = df.to_string()
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))
            extracted_text = df.to_string()
        elif ext == 'json':
            data = json.loads(contents.decode('utf-8', errors='ignore'))
            extracted_text = json.dumps(data, indent=2)
        elif ext in ['txt', 'py', 'js', 'jsx', 'ts', 'sql', 'ipynb', 'html', 'css', 'cpp', 'java']:
            extracted_text = contents.decode('utf-8', errors='ignore')
        else:
            is_binary = True

        if not is_binary and extracted_text.strip():
            extracted_text = extracted_text[:15000]
            logger.info(f"FILE EXTRACTED: {filename} (Size: {len(extracted_text)} chars)")

        return {"filename": filename, "content": extracted_text if not is_binary else None, "is_binary": is_binary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@router.get("/summary")
async def get_summary(dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key)
    columns = [{"name": str(c), "type": "FLOAT" if pd.api.types.is_numeric_dtype(df[c]) else "VARCHAR", "nulls": int(df[c].isnull().sum()), "unique": int(df[c].nunique())} for c in df.columns]
    return {"status": "success", "total_records": len(df), "total_columns": len(df.columns), "missing_values": int(df.isnull().sum().sum()), "file_footprint": f"{df.memory_usage(deep=True).sum() / 1024:.1f} KB", "columns": columns, "sample_data": dm.clean_df_for_json(df)}

@router.post("/detect-nulls")
async def detect_nulls(dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key)
    null_rows = df[df.isnull().any(axis=1)]
    return {"status": "success", "affected_rows_count": int(len(null_rows)), "data_grid": dm.clean_df_for_json(null_rows)}

@router.post("/impute-missing")
async def impute_missing(req: ImputeRequest, dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key).copy()
    cols_to_impute = req.columns if req.columns else df.columns.tolist()
    
    for col in cols_to_impute:
        if col in df.columns and df[col].isnull().any():
            if req.strategy == "zero":
                df[col] = df[col].fillna(0)
            elif pd.api.types.is_numeric_dtype(df[col]):
                if req.strategy == "mean":
                    val = df[col].mean()
                elif req.strategy == "median":
                    val = df[col].median()
                else: 
                    val = df[col].mode()[0] if not df[col].mode().empty else 0
                df[col] = df[col].fillna(val)
            else:
                val = df[col].mode()[0] if not df[col].mode().empty else "Unknown"
                df[col] = df[col].fillna(val)
                
    dm.datasets[dataset_key] = df
    return {"status": "success", "remaining_nulls": int(df.isnull().sum().sum()), "data_grid": dm.clean_df_for_json(df)}

@router.post("/delete-nulls")
async def delete_nulls(dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key).copy()
    initial = len(df)
    df = df.dropna()
    dm.datasets[dataset_key] = df
    return {"status": "success", "rows_removed": int(initial - len(df)), "total_records": int(len(df)), "data_grid": dm.clean_df_for_json(df)}

@router.post("/deduplicate")
async def deduplicate(dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key).copy()
    initial = len(df)
    df = df.drop_duplicates()
    dm.datasets[dataset_key] = df
    return {"status": "success", "rows_removed": int(initial - len(df)), "total_records": int(len(df)), "data_grid": dm.clean_df_for_json(df)}

@router.post("/auto-clean")
async def auto_clean(dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key).copy()
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str).str.strip().replace({'nan': None, 'None': None})
    df = df.dropna(how='all').dropna(axis=1, how='all')
    df = df.reset_index(drop=True)
    dm.datasets[dataset_key] = df
    return {"status": "success", "message": "Auto-aligned and cleaned", "total_records": int(len(df)), "total_columns": int(len(df.columns)), "data_grid": dm.clean_df_for_json(df)}

@router.get("/column-stats")
async def column_stats(column_name: str, dataset_key: str = "rsvp_movies"):
    df = dm.get_df(dataset_key)
    if column_name not in df.columns:
        raise HTTPException(status_code=404, detail="Column not found")
    
    col = df[column_name]
    is_num = pd.api.types.is_numeric_dtype(col)
    stats = {"is_numeric": is_num, "count": int(col.count()), "missing": int(col.isnull().sum()), "unique": int(col.nunique())}
    
    if is_num:
        col_clean = col.dropna()
        stats.update({
            "sum": round(float(col_clean.sum()), 2),
            "mean": round(float(col_clean.mean()), 2),
            "median": round(float(col_clean.median()), 2),
            "mode": round(float(col_clean.mode()[0]), 2) if not col_clean.mode().empty else None,
            "min": round(float(col_clean.min()), 2),
            "max": round(float(col_clean.max()), 2),
            "range": round(float(col_clean.max() - col_clean.min()), 2),
            "std_dev": round(float(col_clean.std()), 2),
            "variance": round(float(col_clean.var()), 2),
        })
    else:
        stats["mode"] = str(col.mode()[0]) if not col.mode().empty else "N/A"
        
    return stats