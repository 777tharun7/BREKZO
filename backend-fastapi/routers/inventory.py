"""Inventory router"""
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_db

router = APIRouter()

class RestockRequest(BaseModel):
    ingredient_id: int
    amount: float

@router.get("/{canteen_id}")
async def get_inventory(canteen_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        ingredients = await conn.fetch("SELECT * FROM ingredients WHERE canteen_id=$1 ORDER BY id", canteen_id)
        return [dict(i) for i in ingredients]

@router.post("/{canteen_id}/restock")
async def restock_inventory(canteen_id: int, req: RestockRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE ingredients SET current_stock = current_stock + $1 WHERE id = $2 AND canteen_id = $3",
            req.amount, req.ingredient_id, canteen_id
        )
        return {"success": True}
