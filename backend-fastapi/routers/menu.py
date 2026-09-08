"""Menu router"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from database import get_db

router = APIRouter()


@router.get("/canteen/{canteen_id}")
async def get_menu(canteen_id: int, category: Optional[str] = None, search: Optional[str] = None):
    pool = await get_db()
    async with pool.acquire() as conn:
        query = "SELECT * FROM menu_items WHERE canteen_id=$1"
        params = [canteen_id]
        
        idx = 2
        if category and category != "All":
            query += f" AND category=${idx}"
            params.append(category)
            idx += 1
        if search:
            query += f" AND name ILIKE ${idx}"
            params.append(f"%{search}%")
            idx += 1
            
        query += " ORDER BY category, total_orders DESC"
        items = await conn.fetch(query, *params)
        return [dict(i) for i in items]


@router.get("/canteen/{canteen_id}/categories")
async def get_categories(canteen_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        cats = await conn.fetch(
            "SELECT DISTINCT category FROM menu_items WHERE canteen_id=$1 ORDER BY category",
            canteen_id
        )
        return ["All"] + [c["category"] for c in cats]


@router.get("/{item_id}")
async def get_item(item_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        item = await conn.fetchrow("SELECT * FROM menu_items WHERE id=$1", item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return dict(item)


class MenuItemCreate(BaseModel):
    canteen_id: int
    name: str
    description: Optional[str] = None
    price: float
    category: str
    dietary_type: str = "veg"
    stock_limit: int = 50
    prep_time_minutes: int = 10
    calories: Optional[int] = None
    sizes: Optional[List[Dict[str, Any]]] = []
    addons: Optional[List[Dict[str, Any]]] = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    dietary_type: Optional[str] = None
    stock_limit: Optional[int] = None
    current_stock: Optional[int] = None
    is_available: Optional[bool] = None
    prep_time_minutes: Optional[int] = None
    calories: Optional[int] = None
    sizes: Optional[List[Dict[str, Any]]] = None
    addons: Optional[List[Dict[str, Any]]] = None


@router.post("/")
async def create_item(item: MenuItemCreate):
    pool = await get_db()
    async with pool.acquire() as conn:
        sizes_json = json.dumps(item.sizes) if item.sizes else '[]'
        addons_json = json.dumps(item.addons) if item.addons else '[]'
        item_id = await conn.fetchval(
            "INSERT INTO menu_items (canteen_id, name, description, price, category, dietary_type, stock_limit, current_stock, prep_time_minutes, calories, sizes, addons) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb) RETURNING id",
            item.canteen_id, item.name, item.description, item.price, item.category,
            item.dietary_type, item.stock_limit, item.stock_limit, item.prep_time_minutes, item.calories, sizes_json, addons_json
        )
        new_item = await conn.fetchrow("SELECT * FROM menu_items WHERE id=$1", item_id)
        return dict(new_item)


@router.put("/{item_id}")
async def update_item(item_id: int, item: MenuItemUpdate):
    pool = await get_db()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM menu_items WHERE id=$1", item_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
            
        updates = {k: v for k, v in item.model_dump().items() if v is not None}
        if "is_available" in updates:
            updates["is_available"] = 1 if updates["is_available"] else 0
        if "sizes" in updates:
            updates["sizes"] = json.dumps(updates["sizes"])
        if "addons" in updates:
            updates["addons"] = json.dumps(updates["addons"])
            
        if updates:
            set_clause = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
            values = list(updates.values())
            values.append(item_id)
            await conn.execute(f"UPDATE menu_items SET {set_clause} WHERE id=${len(values)}", *values)
            
        updated = await conn.fetchrow("SELECT * FROM menu_items WHERE id=$1", item_id)
        return dict(updated)


@router.delete("/{item_id}")
async def delete_item(item_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM menu_items WHERE id=$1", item_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        await conn.execute("DELETE FROM menu_items WHERE id=$1", item_id)
        return {"success": True}
