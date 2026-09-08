import asyncio
import asyncpg
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or "$" in DATABASE_URL:
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "food_app_db")
    encoded_password = urllib.parse.quote_plus(POSTGRES_PASSWORD)
    DATABASE_URL = f"postgres://{POSTGRES_USER}:{encoded_password}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

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

async def update_images():
    print("Connecting to DB...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("Fetching items...")
    items = await conn.fetch("SELECT id, name FROM menu_items")
    
    updated_count = 0
    for item in items:
        name = item["name"].lower()
        img = DEFAULT_IMAGE
        for keyword, url in IMAGE_MAP.items():
            if keyword in name:
                img = url
                break
                
        await conn.execute("UPDATE menu_items SET image_url=$1 WHERE id=$2", img, item["id"])
        updated_count += 1
        
    await conn.close()
    print(f"Successfully updated images for {updated_count} menu items!")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_images())
