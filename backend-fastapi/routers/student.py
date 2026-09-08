from __future__ import annotations
"""Student profile & preferences router"""
from fastapi import APIRouter
from pydantic import BaseModel
from database import get_db
import json

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: str | None = None
    allergies: list[str] | None = None
    preferences: list[str] | None = None

@router.patch("/{user_id}/profile")
async def update_profile(user_id: int, req: ProfileUpdate):
    pool = await get_db()
    async with pool.acquire() as conn:
        updates = {}
        if req.name is not None:
            updates["name"] = req.name
        if req.allergies is not None:
            updates["allergies"] = json.dumps(req.allergies)
        if req.preferences is not None:
            updates["preferences"] = json.dumps(req.preferences)
            
        if updates:
            set_clause = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
            values = list(updates.values())
            values.append(user_id)
            await conn.execute(f"UPDATE users SET {set_clause} WHERE id=${len(values)}", *values)
            
        return {"success": True}
