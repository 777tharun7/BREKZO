import sys
import os

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend-fastapi")
sys.path.insert(0, backend_path)

from main import app
