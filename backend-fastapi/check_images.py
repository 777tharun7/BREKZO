import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    rows = await conn.fetchval("SELECT count(*) FROM menu_items WHERE image_url IS NOT NULL")
    print("Images set for:", rows, "items")
    await conn.close()

asyncio.run(check())
