"""Wallet router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db

router = APIRouter()

class TopupRequest(BaseModel):
    user_id: int
    amount: float
    payment_method: str = "upi"

@router.post("/topup")
async def topup_wallet(req: TopupRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        async with conn.transaction():
            user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", req.user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Add to wallet
            await conn.execute("UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id=$2", req.amount, req.user_id)
            
            # Record transaction
            await conn.execute(
                "INSERT INTO transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)",
                req.user_id, "credit", req.amount, f"Wallet top-up via {req.payment_method}"
            )
            
            updated_balance = await conn.fetchval("SELECT wallet_balance FROM users WHERE id=$1", req.user_id)
            return {"success": True, "new_balance": updated_balance}

@router.get("/{user_id}/transactions")
async def get_transactions(user_id: int, limit: int = 20, offset: int = 0):
    pool = await get_db()
    async with pool.acquire() as conn:
        txs = await conn.fetch(
            "SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            user_id, limit, offset
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM transactions WHERE user_id=$1", user_id)
        return {"transactions": [dict(t) for t in txs], "total": total}
