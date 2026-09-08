"""
Breakzo FastAPI Backend - Main Application
"""
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
from database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing Database...")
    await init_db()
    yield
    # Shutdown
    from database import pool
    if pool:
        await pool.close()

from routers import (
    auth, canteens, menu, orders, wallet,
    offers, waste, student, analytics,
    ai_router, optimizer, inventory, payments, pickup, weather, reviews
)

# Create Socket.io server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

# Create FastAPI app
app = FastAPI(
    title="Breakzo API",
    description="Campus Canteen Food Ordering Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(canteens.router, prefix="/api/canteens", tags=["Canteens"])
app.include_router(menu.router, prefix="/api/menu", tags=["Menu"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(offers.router, prefix="/api/offers", tags=["Offers"])
app.include_router(waste.router, prefix="/api/waste", tags=["Waste"])
app.include_router(student.router, prefix="/api/student", tags=["Student"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI"])
app.include_router(optimizer.router, prefix="/api/optimizer", tags=["Optimizer"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(pickup.router, prefix="/api/pickup", tags=["Pickup"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])

# Store sio on app state so routers can access it
app.state.sio = sio

# Socket.io events
@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_order(sid, data):
    order_id = data.get("order_id")
    await sio.enter_room(sid, f"order_{order_id}")
    print(f"Client {sid} joined order room {order_id}")

@sio.event
async def join_kitchen(sid, data):
    canteen_id = data.get("canteen_id")
    await sio.enter_room(sid, f"kitchen_{canteen_id}")
    print(f"Client {sid} joined kitchen room {canteen_id}")

@sio.event
async def join_user(sid, data):
    user_id = data.get("user_id")
    if user_id:
        await sio.enter_room(sid, f"user_{user_id}")
        print(f"Client {sid} joined user room {user_id}")

@sio.event
async def update_order_status(sid, data):
    """Kitchen staff updates order status"""
    order_id = data.get("order_id")
    new_status = data.get("status")
    canteen_id = data.get("canteen_id")
    user_id = data.get("user_id")

    # Broadcast to order tracking room
    await sio.emit("order_status_updated", {
        "order_id": order_id,
        "status": new_status,
        "canteen_id": canteen_id
    }, room=f"order_{order_id}")

    # Broadcast to kitchen room for other kitchen clients
    await sio.emit("kitchen_order_updated", {
        "order_id": order_id,
        "status": new_status
    }, room=f"kitchen_{canteen_id}", skip_sid=sid)

    # Broadcast to user room for global notifications
    if user_id:
        await sio.emit("user_notification", {
            "title": "Order Update",
            "body": f"Your order #{order_id} is now {new_status}!",
            "order_id": order_id,
            "status": new_status
        }, room=f"user_{user_id}")

@app.get("/")
async def root():
    return {"message": "Breakzo API is running!", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Wrap FastAPI with Socket.io ASGI
socket_app = socketio.ASGIApp(sio, app)

# For uvicorn
application = socket_app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
