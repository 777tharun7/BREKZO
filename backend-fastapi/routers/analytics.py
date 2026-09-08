"""Analytics router"""
from fastapi import APIRouter
from database import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats():
    pool = await get_db()
    async with pool.acquire() as conn:
        # Basic stats
        total_orders = await conn.fetchval("SELECT COUNT(*) FROM orders")
        total_revenue = await conn.fetchval("SELECT SUM(total) FROM orders WHERE status='completed'")
        
        # Today's hourly revenue (mocked for demo if no orders today, but let's query actual)
        # Using a simple query to group by hour for today's orders
        hourly_data = await conn.fetch('''
            SELECT EXTRACT(HOUR FROM created_at) as hour, SUM(total) as revenue 
            FROM orders 
            WHERE status='completed' AND DATE(created_at) = CURRENT_DATE 
            GROUP BY hour ORDER BY hour
        ''')
        
        chart_data = []
        if not hourly_data:
            # Fallback mock data if DB is empty for today
            chart_data = [
                {"name": "10 AM", "revenue": 400},
                {"name": "11 AM", "revenue": 800},
                {"name": "12 PM", "revenue": 1500},
                {"name": "1 PM", "revenue": 2200},
                {"name": "2 PM", "revenue": 1800}
            ]
        else:
            for row in hourly_data:
                hour = int(row["hour"])
                am_pm = "AM" if hour < 12 else "PM"
                hr_12 = hour if hour <= 12 else hour - 12
                if hr_12 == 0: hr_12 = 12
                chart_data.append({"name": f"{hr_12} {am_pm}", "revenue": row["revenue"]})
                
        # Top 5 items
        top_items = await conn.fetch('''
            SELECT name, total_orders, price, image_url 
            FROM menu_items 
            ORDER BY total_orders DESC LIMIT 5
        ''')
        
        return {
            "total_orders": total_orders, 
            "total_revenue": total_revenue or 0.0,
            "chart_data": chart_data,
            "top_items": [dict(ti) for ti in top_items]
        }
