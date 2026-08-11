import os
from dotenv import load_dotenv

load_dotenv() # Loads the .env file

class Settings:
    PROJECT_NAME: str = "NEPTUNE Backend"
    VERSION: str = "2.0.0"
    DATABASE_URL: str = "sqlite:///./neptune.db"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")

settings = Settings()
