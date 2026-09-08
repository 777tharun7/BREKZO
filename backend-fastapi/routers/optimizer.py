"""Optimizer router"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_optimizer_stats():
    return {"status": "optimized"}
