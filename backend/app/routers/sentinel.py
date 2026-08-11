from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import pandas as pd
import json

router = APIRouter(prefix="/api/sentinel", tags=["Data Sentinel"])

# Global or state-managed DataFrame (or load from disk/DB)
# For production, load based on session_id or active dataset path
CURRENT_DATASET_PATH = "data/rsvp_movies.csv"

def load_df():
    try:
        return pd.read_csv(CURRENT_DATASET_PATH)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load dataset: {str(e)}")

@router.get("/summary")
def get_dataset_summary():
    df = load_df()
    null_counts = df.isnull().sum().to_dict()
    
    return {
        "total_records": len(df),
        "total_columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "file_footprint": f"{df.memory_usage(deep=True).sum() / (1024 * 1024):.1f} MB",
        "columns": list(df.columns),
        "null_counts_by_column": null_counts,
        "sample_data": df.head(10).fillna("(Missing)").to_dict(orient="records")
    }

@router.post("/detect-nulls")
def detect_null_rows():
    df = load_df()
    # Filter rows that have at least one null value
    null_df = df[df.isnull().any(axis=1)]
    return {
        "affected_rows_count": len(null_df),
        "columns_with_nulls": df.columns[df.isnull().any()].tolist(),
        "data_grid": null_df.head(20).fillna("(Missing)").to_dict(orient="records")
    }

@router.post("/impute-missing")
def impute_missing_data(numeric_strategy: str = "median", categorical_fill: str = "Unknown"):
    df = load_df()
    
    # Impute Numeric columns
    num_cols = df.select_dtypes(include=['number']).columns
    for col in num_cols:
        if numeric_strategy == "median":
            df[col].fillna(df[col].median(), inplace=True)
        elif numeric_strategy == "mean":
            df[col].fillna(df[col].mean(), inplace=True)
            
    # Impute Categorical / Object columns
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        df[col].fillna(categorical_fill, inplace=True)
        
    # Save back to active session / CSV
    df.to_csv(CURRENT_DATASET_PATH, index=False)
    
    return {
        "status": "success",
        "message": "Missing values successfully imputed.",
        "remaining_nulls": int(df.isnull().sum().sum()),
        "data_grid": df.head(20).to_dict(orient="records")
    }

@router.post("/deduplicate")
def deduplicate_rows():
    df = load_df()
    initial_count = len(df)
    df.drop_duplicates(inplace=True)
    df.to_csv(CURRENT_DATASET_PATH, index=False)
    
    removed = initial_count - len(df)
    return {
        "status": "success",
        "rows_removed": removed,
        "total_records": len(df),
        "data_grid": df.head(20).fillna("(Missing)").to_dict(orient="records")
    }