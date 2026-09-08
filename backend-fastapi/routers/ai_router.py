"""AI router (Smart DB Recommendations)"""
from fastapi import APIRouter
from database import get_db
import random
from datetime import datetime

router = APIRouter()

@router.get("/recommendations/{user_id}")
async def get_ai_recommendations(user_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        # Fetch 3 high-rated menu items (in real app, we'd use order history)
        items = await conn.fetch(
            "SELECT * FROM menu_items WHERE rating >= 4.0 ORDER BY RANDOM() LIMIT 3"
        )
        
        hour = datetime.now().hour
        time_context = "morning" if hour < 11 else "afternoon" if hour < 17 else "evening"
        
        recs = []
        for item in items:
            recs.append({
                "item_id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "image_url": item["image_url"] or f"https://source.unsplash.com/400x300/?{item['name'].split()[0]},food",
                "reason": f"Perfect for a {time_context} craving! Our {item['name']} is highly rated."
            })
            
        return {
            "vibe": f"Good {time_context}! Based on current campus trends, here are our top picks for you.",
            "recommendations": recs
        }
