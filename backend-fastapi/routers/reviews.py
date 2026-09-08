from __future__ import annotations
"""Reviews router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
import json

router = APIRouter()


class CreateReviewRequest(BaseModel):
    user_id: int
    order_id: int
    rating: int
    comment: str | None = None


@router.post("/")
async def create_review(req: CreateReviewRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        # Check if order exists and get items
        order = await conn.fetchrow("SELECT items FROM orders WHERE id=$1", req.order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        items = json.loads(order["items"]) if isinstance(order["items"], str) else order["items"]
        if not items:
            raise HTTPException(status_code=400, detail="Order has no items")

        # Associate the review with the first item in the order to satisfy item_id constraint
        item_id = items[0]["id"]

        # Insert review
        await conn.execute(
            "INSERT INTO reviews (user_id, item_id, order_id, rating, comment) VALUES ($1,$2,$3,$4,$5)",
            req.user_id, item_id, req.order_id, req.rating, req.comment
        )
        return {"success": True, "message": "Review submitted successfully"}


@router.get("/")
async def get_reviews(limit: int = 50, offset: int = 0):
    pool = await get_db()
    async with pool.acquire() as conn:
        reviews = await conn.fetch(
            """
            SELECT r.*, u.name as user_name, u.phone as user_phone, m.name as item_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            JOIN menu_items m ON r.item_id = m.id 
            ORDER BY r.created_at DESC 
            LIMIT $1 OFFSET $2
            """,
            limit, offset
        )
        return [dict(r) for r in reviews]
