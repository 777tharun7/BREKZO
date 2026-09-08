"""
Breakzo Backend - PostgreSQL Database Setup & Seed Data using asyncpg
"""
import asyncpg
import json
import os
import urllib.parse
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

# The complete URL for asyncpg from .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or "$" in DATABASE_URL:
    # Fallback to building it from individual env vars if DATABASE_URL is not set properly
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
    if POSTGRES_HOST == "localhost":
        POSTGRES_HOST = "127.0.0.1"
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "food_app_db")
    
    encoded_password = urllib.parse.quote_plus(POSTGRES_PASSWORD)
    DATABASE_URL = f"postgres://{POSTGRES_USER}:{encoded_password}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
print("Connecting to:", DATABASE_URL)

import aiosqlite
import re
from contextlib import asynccontextmanager

# SQLite Compatibility Adapter
class SQLiteRecord(dict):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)
    
    def get(self, key, default=None):
        return super().get(key, default)

def _adapt_sql(sql: str) -> str:
    # Replace $1, $2, etc. with ?
    sql = re.sub(r'\$\d+', '?', sql)
    # Remove ::jsonb or other PostgreSQL casts
    sql = re.sub(r'::[a-zA-Z_]+', '', sql)
    # Adjust postgres specific functions for sqlite
    sql = re.sub(r'SERIAL\s+PRIMARY\s+KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT', sql, flags=re.I)
    sql = re.sub(r'JSONB\s+DEFAULT\s+\'[^\']*\'::jsonb', 'TEXT DEFAULT \'[]\'', sql, flags=re.I)
    sql = re.sub(r'\bJSONB\b', 'TEXT', sql, flags=re.I)
    sql = re.sub(r'\bTIMESTAMP\b', 'DATETIME', sql, flags=re.I)
    sql = re.sub(r'EXTRACT\(HOUR\s+FROM\s+([^)]+)\)', r"CAST(strftime('%H', \1) AS INTEGER)", sql, flags=re.I)
    sql = re.sub(r'\bCURRENT_DATE\b', "DATE('now')", sql, flags=re.I)
    sql = re.sub(r'\bGREATEST\(', "MAX(", sql, flags=re.I)
    sql = re.sub(r'\bLEAST\(', "MIN(", sql, flags=re.I)
    return sql

def _adapt_sql_and_params(sql: str, args):
    if not args:
        return _adapt_sql(sql), ()
    
    # Find all $n in order of appearance
    matches = re.findall(r'\$(\d+)', sql)
    if matches:
        new_args = []
        for m in matches:
            idx = int(m) - 1
            if 0 <= idx < len(args):
                new_args.append(args[idx])
            else:
                new_args.append(None)
        return _adapt_sql(sql), tuple(new_args)
    
    return _adapt_sql(sql), args

class SQLiteConnection:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn = None

    async def _get_conn(self):
        if not self._conn:
            self._conn = await aiosqlite.connect(self.db_path)
            self._conn.row_factory = aiosqlite.Row
            await self._conn.create_function("GREATEST", -1, max)
            await self._conn.create_function("LEAST", -1, min)
            await self._conn.execute("PRAGMA foreign_keys = ON;")
        return self._conn

    async def fetch(self, query: str, *args):
        conn = await self._get_conn()
        sql, adapted_args = _adapt_sql_and_params(query, args)
        cursor = await conn.execute(sql, adapted_args)
        rows = await cursor.fetchall()
        await cursor.close()
        return [SQLiteRecord(dict(row)) for row in rows]

    async def fetchrow(self, query: str, *args):
        conn = await self._get_conn()
        sql, adapted_args = _adapt_sql_and_params(query, args)
        cursor = await conn.execute(sql, adapted_args)
        row = await cursor.fetchone()
        await cursor.close()
        return SQLiteRecord(dict(row)) if row else None

    async def fetchval(self, query: str, *args):
        conn = await self._get_conn()
        sql, adapted_args = _adapt_sql_and_params(query, args)
        cursor = await conn.execute(sql, adapted_args)
        row = await cursor.fetchone()
        await cursor.close()
        if row:
            return row[0]
        return None

    async def execute(self, query: str, *args):
        conn = await self._get_conn()
        sql, adapted_args = _adapt_sql_and_params(query, args)
        cursor = await conn.execute(sql, adapted_args)
        await conn.commit()
        await cursor.close()

    async def executemany(self, query: str, args_list):
        conn = await self._get_conn()
        if args_list and isinstance(args_list[0], (list, tuple)):
            matches = re.findall(r'\$(\d+)', query)
            if matches:
                adapted_list = []
                for a in args_list:
                    new_a = [a[int(m)-1] if 0 <= int(m)-1 < len(a) else None for m in matches]
                    adapted_list.append(tuple(new_a))
                sql = _adapt_sql(query)
                cursor = await conn.executemany(sql, adapted_list)
            else:
                sql = _adapt_sql(query)
                cursor = await conn.executemany(sql, args_list)
        else:
            sql = _adapt_sql(query)
            cursor = await conn.executemany(sql, args_list)
        await conn.commit()
        await cursor.close()

    @asynccontextmanager
    async def transaction(self):
        conn = await self._get_conn()
        try:
            yield self
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

    async def close(self):
        if self._conn:
            await self._conn.close()
            self._conn = None

class SQLitePool:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn_instance = SQLiteConnection(db_path)

    @asynccontextmanager
    async def acquire(self):
        yield self._conn_instance

    async def close(self):
        await self._conn_instance.close()

# Global pool variable
pool = None

async def create_pool():
    global pool
    try:
        pool = await asyncpg.create_pool(dsn=DATABASE_URL, timeout=3)
        print("Connected successfully to PostgreSQL database.")
    except Exception as e:
        orig_db = os.path.join(os.path.dirname(__file__), "breakzo.db")
        db_path = "/tmp/breakzo.db" if os.environ.get("VERCEL") else orig_db
        if os.environ.get("VERCEL") and os.path.exists(orig_db) and not os.path.exists(db_path):
            import shutil
            shutil.copy2(orig_db, db_path)
        print(f"PostgreSQL not accessible ({e}). Falling back to SQLite database at {db_path}...")
        pool = SQLitePool(db_path)
    return pool

async def get_db():
    if not pool:
        await create_pool()
    return pool

async def init_db():
    global pool
    if not pool:
        await create_pool()

    if isinstance(pool, SQLitePool):
        print("SQLite Database ready.")
        return

    async with pool.acquire() as conn:
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'student',
                avatar_url TEXT,
                wallet_balance REAL DEFAULT 200.0,
                loyalty_points INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                highest_streak INTEGER DEFAULT 0,
                allergies JSONB DEFAULT '[]'::jsonb,
                preferences JSONB DEFAULT '[]'::jsonb,
                notifications_enabled INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Canteens table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS canteens (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                location TEXT,
                image_url TEXT,
                is_open INTEGER DEFAULT 1,
                wait_time_minutes INTEGER DEFAULT 10,
                rating REAL DEFAULT 4.2,
                total_reviews INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Menu items table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                canteen_id INTEGER NOT NULL REFERENCES canteens(id),
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                image_url TEXT,
                dietary_type TEXT DEFAULT 'veg',
                stock_limit INTEGER DEFAULT 50,
                current_stock INTEGER DEFAULT 50,
                is_available INTEGER DEFAULT 1,
                prep_time_minutes INTEGER DEFAULT 10,
                calories INTEGER,
                sizes JSONB DEFAULT '[]'::jsonb,
                addons JSONB DEFAULT '[]'::jsonb,
                rating REAL DEFAULT 4.0,
                total_orders INTEGER DEFAULT 0
            )
        """)

        # Ingredients table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ingredients (
                id SERIAL PRIMARY KEY,
                canteen_id INTEGER NOT NULL REFERENCES canteens(id),
                name TEXT NOT NULL,
                unit TEXT NOT NULL,
                current_stock REAL DEFAULT 0,
                min_stock_alert REAL DEFAULT 10,
                cost_per_unit REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Recipe ingredients table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id SERIAL PRIMARY KEY,
                menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
                quantity_required REAL NOT NULL
            )
        """)

        # Orders table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                canteen_id INTEGER NOT NULL REFERENCES canteens(id),
                items JSONB NOT NULL,
                subtotal REAL NOT NULL,
                discount REAL DEFAULT 0,
                total REAL NOT NULL,
                payment_method TEXT DEFAULT 'wallet',
                promo_code TEXT,
                status TEXT DEFAULT 'pending',
                scheduled_time TIMESTAMP,
                estimated_ready TIMESTAMP,
                pickup_code TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Transactions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                reference_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Offers table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS offers (
                id SERIAL PRIMARY KEY,
                canteen_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                offer_type TEXT DEFAULT 'combo',
                discount_percent REAL,
                discount_amount REAL,
                min_order_amount REAL DEFAULT 0,
                image_url TEXT,
                is_active INTEGER DEFAULT 1,
                valid_until TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Coupons table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                description TEXT,
                discount_percent REAL,
                discount_amount REAL,
                min_order_amount REAL DEFAULT 0,
                max_uses INTEGER DEFAULT 100,
                used_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                valid_until TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Reviews table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                item_id INTEGER NOT NULL REFERENCES menu_items(id),
                order_id INTEGER,
                rating INTEGER NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Waste log table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS waste_log (
                id SERIAL PRIMARY KEY,
                canteen_id INTEGER NOT NULL REFERENCES canteens(id),
                item_id INTEGER NOT NULL,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_cost REAL NOT NULL,
                total_cost REAL NOT NULL,
                reason TEXT,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Refunds table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS refunds (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                amount REAL NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed data
        await _seed_data(conn)


async def _seed_data(conn):
    # Check if already seeded
    count = await conn.fetchval("SELECT COUNT(*) FROM canteens")
    if count > 0:
        return

    # Seed canteens
    canteens = [
        ("Spice Garden", "North Indian & South Indian cuisine with daily specials", "Block A, Ground Floor",
         "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400", 1, 8, 4.5),
        ("The Byte Cafe", "Quick bites, sandwiches, beverages & continental favorites", "Block B, First Floor",
         "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400", 1, 12, 4.3),
        ("Green Bowl", "Healthy salads, juices, wraps & vegan options", "Block C, Ground Floor",
         "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", 1, 6, 4.6),
    ]
    await conn.executemany(
        "INSERT INTO canteens (name, description, location, image_url, is_open, wait_time_minutes, rating) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        canteens
    )

    # Seed users
    users = [
        ("9999999999", "Admin User", "admin", 500.0, 1200),
        ("8888888888", "Arjun Sharma", "student", 350.0, 850),
        ("7777777777", "Priya Patel", "student", 180.0, 420),
    ]
    for phone, name, role, balance, points in users:
        await conn.execute(
            "INSERT INTO users (phone, name, role, wallet_balance, loyalty_points, current_streak, highest_streak) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            phone, name, role, balance, points, random.randint(1, 15), random.randint(5, 30)
        )

    # Procedural generation of menu items (150+ per canteen)
    adjectives = ["Spicy", "Crispy", "Creamy", "Tandoori", "Roasted", "Grilled", "Cheesy", "Smoked", "Classic", "Zesty", "Signature", "Double", "Loaded", "Hot", "Sweet"]
    ingredients = ["Chicken", "Paneer", "Mushroom", "Potato", "Cheese", "Tofu", "Egg", "Fish", "Veggie", "Corn", "Spinach", "Tomato", "Onion"]
    dish_types = ["Burger", "Pizza", "Pasta", "Sandwich", "Wrap", "Roll", "Salad", "Bowl", "Curry", "Rice", "Noodles", "Tikka", "Fries", "Soup"]
    categories = ["Breakfast", "Lunch", "Snacks", "Dinner", "Beverages", "Desserts"]
    
    all_menus = []
    
    # Generate for Canteen 1
    c1_items = []
    for i in range(150):
        name = f"{random.choice(adjectives)} {random.choice(ingredients)} {random.choice(dish_types)}"
        desc = f"A delicious {name.lower()} prepared freshly."
        price = random.choice([50, 60, 80, 100, 120, 150, 180, 200, 250])
        cat = random.choice(categories)
        diet = "veg" if "Chicken" not in name and "Fish" not in name and "Egg" not in name else "non-veg"
        if "Tofu" in name or "Salad" in name:
            diet = random.choice(["veg", "vegan"])
        cal = random.randint(150, 800)
        c1_items.append((name, desc, price, cat, diet, 50, cal))
    all_menus.append((c1_items, 1))

    # Generate for Canteen 2
    c2_items = []
    for i in range(150):
        name = f"{random.choice(adjectives)} {random.choice(ingredients)} {random.choice(dish_types)}"
        desc = f"A delightful {name.lower()} with special seasoning."
        price = random.choice([60, 70, 90, 110, 130, 160, 190, 220, 280])
        cat = random.choice(categories)
        diet = "veg" if "Chicken" not in name and "Fish" not in name and "Egg" not in name else "non-veg"
        cal = random.randint(200, 900)
        c2_items.append((name, desc, price, cat, diet, 50, cal))
    all_menus.append((c2_items, 2))

    # Generate for Canteen 3
    c3_items = []
    for i in range(150):
        name = f"Healthy {random.choice(ingredients)} {random.choice(dish_types)}"
        desc = f"Nutritious and fresh {name.lower()}."
        price = random.choice([80, 100, 120, 150, 180, 220, 260, 300])
        cat = random.choice(categories)
        diet = "veg" if "Chicken" not in name and "Fish" not in name and "Egg" not in name else "non-veg"
        if diet == "veg" and random.random() > 0.5:
            diet = "vegan"
        cal = random.randint(100, 500)
        c3_items.append((name, desc, price, cat, diet, 50, cal))
    all_menus.append((c3_items, 3))

    all_menus = [(c1_items, 1), (c2_items, 2), (c3_items, 3)]
    for items, cid in all_menus:
        for item in items:
            name, desc, price, cat, diet, stock, cal = item
            rating = round(random.uniform(3.8, 5.0), 1)
            orders = random.randint(50, 500)
            await conn.execute(
                "INSERT INTO menu_items (canteen_id, name, description, price, category, dietary_type, stock_limit, current_stock, prep_time_minutes, calories, rating, total_orders) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
                cid, name, desc, price, cat, diet, stock, stock, random.randint(5, 20), cal, rating, orders
            )

    # Seed ingredients if not exists
    ing_count = await conn.fetchval("SELECT COUNT(*) FROM ingredients")
    if ing_count == 0:
        ingredients_list = [
            (1, "Milk", "L", 50.0, 10.0, 60.0),
            (1, "Rice", "kg", 100.0, 20.0, 50.0),
            (1, "Chicken", "kg", 30.0, 10.0, 200.0),
            (1, "Flour", "kg", 50.0, 15.0, 40.0),
            (1, "Onions", "kg", 40.0, 10.0, 30.0),
            (1, "Tomatoes", "kg", 30.0, 10.0, 40.0),
        ]
        for cid, name, unit, stock, min_alert, cost in ingredients_list:
            await conn.execute(
                "INSERT INTO ingredients (canteen_id, name, unit, current_stock, min_stock_alert, cost_per_unit) VALUES ($1,$2,$3,$4,$5,$6)",
                cid, name, unit, stock, min_alert, cost
            )

        # Map ingredients to some menu items
        menu_items_for_recipe = await conn.fetch("SELECT id, name FROM menu_items WHERE canteen_id=1 LIMIT 20")
        for item in menu_items_for_recipe:
            if "Chicken" in item["name"]:
                ing_id = await conn.fetchval("SELECT id FROM ingredients WHERE name='Chicken'")
                await conn.execute("INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required) VALUES ($1,$2,$3)", item["id"], ing_id, 0.2)
            if "Burger" in item["name"] or "Pizza" in item["name"]:
                ing_id = await conn.fetchval("SELECT id FROM ingredients WHERE name='Flour'")
                await conn.execute("INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required) VALUES ($1,$2,$3)", item["id"], ing_id, 0.1)

    # Seed coupons
    coupons = [
        ("WELCOME50", "50% off on your first order", 50.0, None, 0, 200, 0),
        ("BREAKZO20", "Flat 20% off on orders above ₹100", 20.0, None, 100, 500, 45),
        ("STUDENT10", "10% off for all students", 10.0, None, 0, 1000, 120),
        ("MONSOON30", "Monsoon special: 30% off on beverages", 30.0, None, 0, 100, 8),
        ("FLAT30", "Flat ₹30 off on orders above ₹150", None, 30.0, 150, 300, 67),
        ("HEALTHY15", "15% off on all Green Bowl orders", 15.0, None, 0, 200, 22),
    ]
    for code, desc, disc_pct, disc_amt, min_ord, max_uses, used in coupons:
        await conn.execute(
            "INSERT INTO coupons (code, description, discount_percent, discount_amount, min_order_amount, max_uses, used_count, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            code, desc, disc_pct, disc_amt, min_ord, max_uses, used,
            (datetime.now() + timedelta(days=90))
        )

    # Seed offers/combos
    offers = [
        (1, "Festival Thali Combo", "Full thali + dessert + beverage at special price!", "combo", 25.0, None, 0,
         (datetime.now() + timedelta(days=30))),
        (2, "The Byte Box", "Sandwich + fries + cold coffee combo deal", "combo", 20.0, None, 0,
         (datetime.now() + timedelta(days=45))),
        (3, "Green Power Pack", "Buddha bowl + detox juice + energy balls", "combo", 15.0, None, 0,
         (datetime.now() + timedelta(days=60))),
        (None, "Happy Hours", "All beverages 30% off from 3-5 PM daily", "seasonal", 30.0, None, 0,
         (datetime.now() + timedelta(days=90))),
    ]
    for cid, title, desc, otype, dpct, damt, min_ord, valid_until in offers:
        await conn.execute(
            "INSERT INTO offers (canteen_id, title, description, offer_type, discount_percent, discount_amount, min_order_amount, valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            cid, title, desc, otype, dpct, damt, min_ord, valid_until
        )

    # Seed waste log
    waste_data = []
    for i in range(10):
        days_ago = random.randint(0, 30)
        date = (datetime.now() - timedelta(days=days_ago)).date()
        items_names = ["Samosa", "Paneer Butter Masala", "Pasta Arrabiata", "Masala Dosa", "Veg Thali"]
        item_name = random.choice(items_names)
        qty = random.randint(3, 20)
        unit_cost = random.uniform(30, 120)
        canteen_id = random.randint(1, 3)
        waste_data.append((canteen_id, 1, item_name, qty, round(unit_cost, 2), round(qty * unit_cost, 2), "Overproduction", date))

    await conn.executemany(
        "INSERT INTO waste_log (canteen_id, item_id, item_name, quantity, unit_cost, total_cost, reason, date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        waste_data
    )

    # Seed some past orders and reviews for user id 2 (student)
    order_items = json.dumps([{"id": 6, "name": "Chicken Biryani", "price": 150, "quantity": 2}])
    order_id = await conn.fetchval(
        "INSERT INTO orders (user_id, canteen_id, items, subtotal, total, payment_method, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
        2, 1, order_items, 300, 300, "wallet", "completed", (datetime.now() - timedelta(days=5))
    )

    await conn.execute(
        "INSERT INTO reviews (user_id, item_id, order_id, rating, comment) VALUES ($1,$2,$3,$4,$5)",
        2, 6, order_id, 5, "Best biryani on campus! The spices were perfect and portion size is generous."
    )
    await conn.execute(
        "INSERT INTO transactions (user_id, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
        2, "debit", 300, "Order payment", order_id
    )

    # Second order
    order_items2 = json.dumps([
        {"id": 1, "name": "Masala Dosa", "price": 60, "quantity": 1},
        {"id": 15, "name": "Masala Chai", "price": 20, "quantity": 2}
    ])
    await conn.execute(
        "INSERT INTO orders (user_id, canteen_id, items, subtotal, total, payment_method, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        2, 1, order_items2, 100, 100, "wallet", "completed", (datetime.now() - timedelta(days=2))
    )

    # Topup transaction
    await conn.execute(
        "INSERT INTO transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)",
        2, "credit", 500, "Wallet top-up via UPI"
    )

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
    print("Database initialized successfully!")
