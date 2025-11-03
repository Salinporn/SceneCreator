import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR.parent, '.env'))

API_BASE_URL = os.getenv("API_URL", "http://localhost:8000")