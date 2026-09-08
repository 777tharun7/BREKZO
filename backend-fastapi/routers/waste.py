"""Waste router"""
from fastapi import APIRouter
from database import get_db

router = APIRouter()

@router.get("/")
async def get_waste_logs(limit: int = 50):
    pool = await get_db()
    async with pool.acquire() as conn:
        logs = await conn.fetch("SELECT * FROM waste_log ORDER BY date DESC, created_at DESC LIMIT $1", limit)
        return [dict(l) for l in logs]
