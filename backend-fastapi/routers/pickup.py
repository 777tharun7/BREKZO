"""Pickup router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter()

class VerifyPickupRequest(BaseModel):
    canteen_id: int
    pickup_code: str

@router.post("/verify")
async def verify_pickup(req: VerifyPickupRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        # Find order with this pickup code for this canteen that is 'ready'
        order = await conn.fetchrow(
            "SELECT * FROM orders WHERE canteen_id=$1 AND pickup_code=$2 AND status='ready'",
            req.canteen_id, req.pickup_code
        )
        
        if not order:
            raise HTTPException(status_code=400, detail="Invalid pickup code or order not ready")
            
        # Update order status to completed
        await conn.execute(
            "UPDATE orders SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=$1",
            order["id"]
        )
        
        return {"success": True, "order_id": order["id"], "message": "Order verified and completed"}
