from __future__ import annotations
"""Auth router - phone OTP login (simulated)"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
import json

router = APIRouter()

# In-memory OTP store (simulated)
_otp_store: dict[str, str] = {}


class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    name: str | None = None


@router.post("/send-otp")
async def send_otp(req: SendOTPRequest):
    """Simulate OTP sending - any 6-digit code will work"""
    if not req.phone or len(req.phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    # Simulated: store "123456" as valid OTP for any phone
    _otp_store[req.phone] = "123456"
    return {"success": True, "message": f"OTP sent to {req.phone}", "hint": "Use any 6-digit code or 123456"}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    """Verify OTP and return user session"""
    # Simulated: accept any 4-digit OTP
    if len(req.otp) != 4 or not req.otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be 4 digits")

    # Determine role
    assigned_role = "admin" if req.phone == "1234567890" else "student"

    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE phone = $1", req.phone)

        if not user:
            # Auto-create account
            name = req.name or f"User_{req.phone[-4:]}"
            await conn.execute(
                "INSERT INTO users (phone, name, role, wallet_balance, loyalty_points, current_streak, highest_streak) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                req.phone, name, assigned_role, 200.0, 0, 0, 0
            )
            user = await conn.fetchrow("SELECT * FROM users WHERE phone = $1", req.phone)
        elif user["role"] != assigned_role:
            # Update role if it changed (for development purposes)
            await conn.execute("UPDATE users SET role = $1 WHERE phone = $2", assigned_role, req.phone)
            user = dict(user)
            user["role"] = assigned_role

        # JSONB parsing in asyncpg returns strings or dicts depending on setup, usually strings if unconfigured, or dicts. Let's just safely load.
        allergies = user["allergies"] if isinstance(user["allergies"], (list, dict)) else json.loads(user["allergies"] or "[]")
        preferences = user["preferences"] if isinstance(user["preferences"], (list, dict)) else json.loads(user["preferences"] or "[]")

        return {
            "success": True,
            "token": f"tok_{user['id']}_{req.phone}",
            "user": {
                "id": user["id"],
                "phone": user["phone"],
                "name": user["name"],
                "role": user["role"],
                "wallet_balance": user["wallet_balance"],
                "loyalty_points": user["loyalty_points"],
                "current_streak": user["current_streak"],
                "highest_streak": user["highest_streak"],
                "allergies": allergies,
                "preferences": preferences,
            }
        }


@router.get("/me")
async def get_me(user_id: int):
    """Get current user from token (simplified)"""
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": user["id"],
            "phone": user["phone"],
            "name": user["name"],
            "role": user["role"],
            "wallet_balance": user["wallet_balance"],
            "loyalty_points": user["loyalty_points"],
        }
