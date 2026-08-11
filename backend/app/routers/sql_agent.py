from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3 # or import mysql.connector / sqlalchemy if using MySQL
import pandas as pd
import json

router = APIRouter(prefix="/api/agent/sql", tags=["SQL Sentinel Agent"])

DB_PATH = "data/rsvp_movies.db"  # Path to your SQLite or database connection string

class QueryRequest(BaseModel):
    user_prompt: str
    active_dataset: str = "rsvp_movies"

@router.post("/query")
def process_sql_query(payload: QueryRequest):
    prompt = payload.user_prompt.strip()
    
    # 1. Inspect Database Schema (Schema Context for LLM)
    # In a full setup, pass this schema prompt into your LLM (OpenAI/Ollama/Groq)
    # Prompt template: "You are SQL Sentinel. Convert: {prompt} into SQL for table rsvp_movies."
    
    # 2. Heuristic / LLM Text-to-SQL Translation (Example mapping for testing)
    generated_sql = ""
    prompt_lower = prompt.lower()
    
    if "top" in prompt_lower or "revenue" in prompt_lower or "gross" in prompt_lower:
        generated_sql = """
        SELECT title, year, country, worlwide_gross_income 
        FROM rsvp_movies 
        WHERE worlwide_gross_income IS NOT NULL AND worlwide_gross_income != ''
        ORDER BY CAST(worlwide_gross_income AS NUMERIC) DESC 
        LIMIT 5;
        """
    elif "genre" in prompt_lower or "count" in prompt_lower:
        generated_sql = """
        SELECT country, COUNT(*) as movie_count 
        FROM rsvp_movies 
        GROUP BY country 
        ORDER BY movie_count DESC 
        LIMIT 10;
        """
    else:
        # Default fallback query
        generated_sql = """
        SELECT id, title, year, duration, country, worlwide_gross_income 
        FROM rsvp_movies 
        LIMIT 10;
        """

    # 3. Safe Query Execution
    try:
        conn = sqlite3.connect(DB_PATH)
        df_result = pd.read_sql_query(generated_sql, conn)
        conn.close()
        
        # Format output
        return {
            "agent": "SQL Sentinel",
            "status": "success",
            "generated_sql": generated_sql.strip(),
            "explanation": f"Executed query to extract top records based on your prompt: '{prompt}'",
            "columns": list(df_result.columns),
            "data": df_result.fillna("N/A").to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"SQL Sentinel Execution Error: {str(e)}"
        )