"""Orders router"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from datetime import datetime, timedelta
import json

router = APIRouter()


class OrderItem(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    customizations: Optional[dict] = None


class CreateOrderRequest(BaseModel):
    user_id: int
    canteen_id: int
    items: List[OrderItem]
    payment_method: str = "wallet"
    promo_code: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    split_phone: Optional[str] = None


@router.post("/")
async def create_order(request: Request, req: CreateOrderRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Calculate subtotal
            subtotal = sum(item.price * item.quantity for item in req.items)

            # Apply promo code
            discount = 0.0
            if req.promo_code:
                coupon = await conn.fetchrow(
                    "SELECT * FROM coupons WHERE code=$1 AND is_active=1",
                    req.promo_code.upper()
                )
                if coupon:
                    if coupon["discount_percent"]:
                        discount = subtotal * coupon["discount_percent"] / 100
                    elif coupon["discount_amount"]:
                        discount = min(coupon["discount_amount"], subtotal)
                    await conn.execute("UPDATE coupons SET used_count=used_count+1 WHERE id=$1", coupon["id"])

            total = max(0, subtotal - discount)

            # Check wallet balance
            if req.payment_method == "wallet":
                user = await conn.fetchrow("SELECT wallet_balance FROM users WHERE id=$1", req.user_id)
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                if req.split_phone:
                    friend = await conn.fetchrow("SELECT id, wallet_balance FROM users WHERE phone=$1", req.split_phone)
                    if not friend:
                        raise HTTPException(status_code=404, detail="Friend's phone number not registered")
                    if friend["id"] == req.user_id:
                        raise HTTPException(status_code=400, detail="Cannot split bill with yourself")
                    
                    half_total = total / 2
                    if user["wallet_balance"] < half_total:
                        raise HTTPException(status_code=400, detail="You have insufficient balance for your half")
                    if friend["wallet_balance"] < half_total:
                        raise HTTPException(status_code=400, detail="Your friend has insufficient balance for their half")
                    
                    # Deduct from both
                    await conn.execute("UPDATE users SET wallet_balance=wallet_balance-$1 WHERE id=$2", half_total, req.user_id)
                    await conn.execute("UPDATE users SET wallet_balance=wallet_balance-$1 WHERE id=$2", half_total, friend["id"])
                    
                else:
                    if user["wallet_balance"] < total:
                        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
                    await conn.execute("UPDATE users SET wallet_balance=wallet_balance-$1 WHERE id=$2", total, req.user_id)

            # Estimate ready time
            item_ids = [item.id for item in req.items]
            placeholders = ",".join(f"${i+1}" for i in range(len(item_ids)))
            avg_prep = await conn.fetchval(
                f"SELECT AVG(prep_time_minutes) FROM menu_items WHERE id IN ({placeholders})",
                *item_ids
            )
            
            prep_minutes = int(avg_prep or 10) + 5
            estimated_ready = datetime.now() + timedelta(minutes=prep_minutes)

            items_json = json.dumps([i.model_dump() for i in req.items])
            scheduled_time = None
            if req.scheduled_time:
                try:
                    scheduled_time = datetime.strptime(req.scheduled_time, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    pass

            # Generate 6-digit pickup code
            import random
            pickup_code = str(random.randint(100000, 999999))

            # Create order
            order_id = await conn.fetchval(
                "INSERT INTO orders (user_id, canteen_id, items, subtotal, discount, total, payment_method, promo_code, status, estimated_ready, scheduled_time, pickup_code, notes) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id",
                req.user_id, req.canteen_id, items_json,
                subtotal, discount, total, req.payment_method, req.promo_code,
                "pending", estimated_ready, scheduled_time, pickup_code, req.notes
            )

            # Record transaction
            if req.split_phone:
                await conn.execute(
                    "INSERT INTO transactions (user_id, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
                    req.user_id, "debit", half_total, f"Split Order #{order_id} (Your Half)", order_id
                )
                await conn.execute(
                    "INSERT INTO transactions (user_id, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
                    friend["id"], "debit", half_total, f"Split Order #{order_id} (Friend's Half)", order_id
                )
            else:
                await conn.execute(
                    "INSERT INTO transactions (user_id, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
                    req.user_id, "debit", total, f"Order #{order_id}", order_id
                )

            # Award loyalty points (1 point per ₹10 spent)
            points_earned = int(total / 10)
            await conn.execute(
                "UPDATE users SET loyalty_points=loyalty_points+$1, current_streak=current_streak+1 WHERE id=$2",
                points_earned, req.user_id
            )

            # Update stock
            for item in req.items:
                await conn.execute(
                    "UPDATE menu_items SET current_stock=GREATEST(0, current_stock-$1), total_orders=total_orders+$1 WHERE id=$2",
                    item.quantity, item.id
                )
                
                # Auto-deduct raw ingredients based on recipe Bill of Materials
                recipe = await conn.fetch("SELECT ingredient_id, quantity_required FROM recipe_ingredients WHERE menu_item_id=$1", item.id)
                for req_ing in recipe:
                    await conn.execute(
                        "UPDATE ingredients SET current_stock=GREATEST(0, current_stock-$1) WHERE id=$2",
                        req_ing["quantity_required"] * item.quantity, req_ing["ingredient_id"]
                    )

            order = await conn.fetchrow(
                "SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o JOIN users u ON o.user_id=u.id WHERE o.id=$1",
                order_id
            )
            order_dict = dict(order)
            order_dict["items"] = json.loads(order_dict["items"]) if isinstance(order_dict["items"], str) else order_dict["items"]
            
            # Serialize datetimes for socketio
            for k, v in order_dict.items():
                if isinstance(v, datetime):
                    order_dict[k] = v.isoformat()
            
            # Emit socket event for KDS auto-refresh
            sio = request.app.state.sio
            await sio.emit("kitchen_order_updated", {
                "order_id": order_id,
                "status": "pending",
                "order": order_dict
            }, room=f"kitchen_{req.canteen_id}")
            
            return order_dict


@router.get("/{order_id}")
async def get_order(order_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        order = await conn.fetchrow("SELECT * FROM orders WHERE id=$1", order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order_dict = dict(order)
        order_dict["items"] = json.loads(order_dict["items"]) if isinstance(order_dict["items"], str) else order_dict["items"]
        return order_dict


@router.get("/user/{user_id}")
async def get_user_orders(user_id: int, limit: int = 20, offset: int = 0):
    pool = await get_db()
    async with pool.acquire() as conn:
        orders = await conn.fetch(
            "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            user_id, limit, offset
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM orders WHERE user_id=$1", user_id)
        result = []
        for o in orders:
            od = dict(o)
            od["items"] = json.loads(od["items"]) if isinstance(od["items"], str) else od["items"]
            result.append(od)
        return {"orders": result, "total": total}


@router.get("/canteen/{canteen_id}/active")
async def get_canteen_active_orders(canteen_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        orders = await conn.fetch(
            "SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o JOIN users u ON o.user_id=u.id WHERE o.canteen_id=$1 AND o.status NOT IN ('completed','cancelled') ORDER BY o.created_at ASC",
            canteen_id
        )
        result = []
        for o in orders:
            od = dict(o)
            od["items"] = json.loads(od["items"]) if isinstance(od["items"], str) else od["items"]
            result.append(od)
        return result


@router.get("/canteen/{canteen_id}/all")
async def get_canteen_all_orders(canteen_id: int, limit: int = 50, offset: int = 0):
    pool = await get_db()
    async with pool.acquire() as conn:
        orders = await conn.fetch(
            "SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id=u.id WHERE o.canteen_id=$1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3",
            canteen_id, limit, offset
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM orders WHERE canteen_id=$1", canteen_id)
        result = []
        for o in orders:
            od = dict(o)
            od["items"] = json.loads(od["items"]) if isinstance(od["items"], str) else od["items"]
            result.append(od)
        return {"orders": result, "total": total}


class UpdateStatusRequest(BaseModel):
    status: str


@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, req: UpdateStatusRequest):
    pool = await get_db()
    async with pool.acquire() as conn:
        valid_statuses = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"]
        if req.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status")
        await conn.execute(
            "UPDATE orders SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2",
            req.status, order_id
        )
        return {"success": True, "order_id": order_id, "status": req.status}
