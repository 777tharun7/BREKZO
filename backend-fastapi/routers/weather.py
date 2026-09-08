"""Weather router"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_weather():
    return {"temperature": 25, "condition": "Sunny"}
