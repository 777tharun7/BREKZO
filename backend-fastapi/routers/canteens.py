from __future__ import annotations
"""Canteens router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter()


@router.get("/")
async def get_canteens():
    pool = await get_db()
    async with pool.acquire() as conn:
        canteens = await conn.fetch("SELECT * FROM canteens")
        result = []
        for c in canteens:
            # Get top 3 items for preview
            items = await conn.fetch(
                "SELECT name, price, dietary_type, rating FROM menu_items WHERE canteen_id=$1 AND is_available=1 ORDER BY total_orders DESC LIMIT 3",
                c["id"]
            )
            c_dict = dict(c)
            c_dict["top_items"] = [dict(i) for i in items]
            result.append(c_dict)
        return result


@router.get("/{canteen_id}")
async def get_canteen(canteen_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        c = await conn.fetchrow("SELECT * FROM canteens WHERE id=$1", canteen_id)
        if not c:
            raise HTTPException(status_code=404, detail="Canteen not found")
        return dict(c)


class CanteenStatusUpdate(BaseModel):
    is_open: bool
    wait_time_minutes: int | None = None


@router.patch("/{canteen_id}/status")
async def update_canteen_status(canteen_id: int, body: CanteenStatusUpdate):
    pool = await get_db()
    async with pool.acquire() as conn:
        c = await conn.fetchrow("SELECT * FROM canteens WHERE id=$1", canteen_id)
        if not c:
            raise HTTPException(status_code=404, detail="Canteen not found")
        if body.wait_time_minutes is not None:
            await conn.execute(
                "UPDATE canteens SET is_open=$1, wait_time_minutes=$2 WHERE id=$3",
                1 if body.is_open else 0, body.wait_time_minutes, canteen_id
            )
        else:
            await conn.execute("UPDATE canteens SET is_open=$1 WHERE id=$2", 1 if body.is_open else 0, canteen_id)
        return {"success": True, "is_open": body.is_open}
