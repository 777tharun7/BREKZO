"""Offers router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from database import get_db

router = APIRouter()

@router.get("/")
async def get_offers(admin: bool = False):
    pool = await get_db()
    async with pool.acquire() as conn:
        query = "SELECT * FROM offers ORDER BY id DESC" if admin else "SELECT * FROM offers WHERE is_active=1 ORDER BY id DESC"
        offers = await conn.fetch(query)
        return [dict(o) for o in offers]

@router.get("/coupons")
async def get_coupons(admin: bool = False):
    pool = await get_db()
    async with pool.acquire() as conn:
        query = "SELECT * FROM coupons ORDER BY id DESC" if admin else "SELECT * FROM coupons WHERE is_active=1 ORDER BY id DESC"
        coupons = await conn.fetch(query)
        return [dict(c) for c in coupons]

class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    offer_type: str = 'combo'
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    min_order_amount: float = 0
    valid_days: int = 30

@router.post("/")
async def create_offer(req: OfferCreate):
    pool = await get_db()
    async with pool.acquire() as conn:
        valid_until = datetime.now() + timedelta(days=req.valid_days)
        await conn.execute(
            "INSERT INTO offers (title, description, offer_type, discount_percent, discount_amount, min_order_amount, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            req.title, req.description, req.offer_type, req.discount_percent, req.discount_amount, req.min_order_amount, valid_until
        )
        return {"success": True}

@router.patch("/{offer_id}/toggle")
async def toggle_offer(offer_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE offers SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=$1", offer_id)
        return {"success": True}

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    min_order_amount: float = 0
    max_uses: int = 100
    valid_days: int = 30

@router.post("/coupons")
async def create_coupon(req: CouponCreate):
    pool = await get_db()
    async with pool.acquire() as conn:
        valid_until = datetime.now() + timedelta(days=req.valid_days)
        await conn.execute(
            "INSERT INTO coupons (code, description, discount_percent, discount_amount, min_order_amount, max_uses, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            req.code.upper(), req.description, req.discount_percent, req.discount_amount, req.min_order_amount, req.max_uses, valid_until
        )
        return {"success": True}

@router.patch("/coupons/{coupon_id}/toggle")
async def toggle_coupon(coupon_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE coupons SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=$1", coupon_id)
        return {"success": True}

@router.get("/update-images")
async def update_images():
    pool = await get_db()
    async with pool.acquire() as conn:
        IMAGE_MAP = {
            "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
            "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
            "pasta": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400",
            "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400",
            "wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400",
            "roll": "https://images.unsplash.com/photo-1544025162-811114fb0c90?w=400",
            "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
            "bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
            "curry": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
            "rice": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
            "noodles": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
            "tikka": "https://images.unsplash.com/photo-1599487405270-8e7f59d8ea42?w=400",
            "fries": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400",
            "soup": "https://images.unsplash.com/photo-1547592180-85f173990554?w=400",
            "biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400",
            "dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400",
            "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400",
            "chicken": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400",
            "tea": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
            "coffee": "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400",
            "thali": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400"
        }
        DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"

        items = await conn.fetch("SELECT id, name FROM menu_items")
        updated = 0
        for item in items:
            name = item["name"].lower()
            img = DEFAULT_IMAGE
            for keyword, url in IMAGE_MAP.items():
                if keyword in name:
                    img = url
                    break
            await conn.execute("UPDATE menu_items SET image_url=$1 WHERE id=$2", img, item["id"])
            updated += 1
        return {"success": True, "updated": updated}
