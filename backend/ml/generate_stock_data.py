import os
import mysql.connector
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')

def load_env():
    env_vars = {}
    try:
        with open(ENV_PATH) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value.strip('"\'')
    except FileNotFoundError:
        print(f"Warning: .env file not found at {ENV_PATH}")
    return env_vars

env = load_env()

# Database configuration
db_config = {
    'host': env.get('DB_HOST', 'localhost'),
    'port': int(env.get('DB_PORT', '3306')),
    'user': env.get('DB_USER', 'root'),
    'password': env.get('DB_PASSWORD', 'Admin@123'),
    'database': env.get('DB_NAME', 'stock_prediction_db')
}

# Stock configuration
symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'DIS', 'V']
base_prices = {
    'AAPL': 142, 'GOOGL': 92, 'MSFT': 245, 'AMZN': 85, 
    'TSLA': 120, 'NVDA': 180, 'META': 160, 'NFLX': 300, 
    'DIS': 95, 'V': 210
}

def clear_old_data(cursor):
    """Remove existing prediction data"""
    cursor.execute("DELETE FROM predictions")
    print("Cleared previous prediction data")

def generate_new_data(cursor, start_date, days=100):
    """Generate fresh historical data"""
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        for symbol in symbols:
            cursor.execute("SELECT id FROM stocks WHERE symbol = %s", (symbol,))
            result = cursor.fetchone()
            if not result:
                print(f"Warning: Stock {symbol} not found")
                continue
                
            stock_id = result[0]
            
            # Convert base price to Decimal for precise calculations
            base_price = Decimal(str(base_prices[symbol]))
            trend = Decimal('0.001') * (Decimal('1') + Decimal(str(day))/Decimal('100'))
            volatility = Decimal(str(random.uniform(0.01, 0.03)))
            random_change = Decimal(str(random.uniform(-float(volatility), float(volatility))))
            price = base_price * (Decimal('1') + trend + random_change)
            
            # Generate OHLCV data
            open_price = round(float(price), 2)
            close_price = round(float(price * (Decimal('1') + Decimal(str(random.uniform(-0.01, 0.01))))), 2)
            high_price = round(max(open_price, close_price) * (1 + random.uniform(0, 0.015)), 2)
            low_price = round(min(open_price, close_price) * (1 - random.uniform(0, 0.015)), 2)
            volume = random.randint(5_000_000, 150_000_000)
            
            cursor.execute(
                """INSERT INTO historical_data 
                (stock_id, date, open_price, high_price, low_price, close_price, adj_close, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                open_price=VALUES(open_price),
                high_price=VALUES(high_price),
                low_price=VALUES(low_price),
                close_price=VALUES(close_price),
                adj_close=VALUES(adj_close),
                volume=VALUES(volume)""",
                (stock_id, current_date.date(), open_price, high_price, low_price, 
                 close_price, close_price, volume)
            )
        
        print(f"Generated data for {current_date.date()}")

def generate_predictions(cursor):
    """Generate new predictions with proper decimal handling"""
    for symbol in symbols:
        cursor.execute("SELECT id FROM stocks WHERE symbol = %s", (symbol,))
        result = cursor.fetchone()
        if not result:
            print(f"Warning: Stock {symbol} not found")
            continue
            
        stock_id = result[0]
        
        cursor.execute(
            """SELECT AVG(close_price) FROM historical_data 
            WHERE stock_id = %s AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)""",
            (stock_id,)
        )
        avg_price = cursor.fetchone()[0]
        
        if avg_price is None:
            print(f"No historical data found for {symbol}")
            continue
            
        # Convert to float for calculation, then back to Decimal for storage
        predicted_price = round(float(avg_price) * (1 + random.uniform(-0.05, 0.1)), 2)
        confidence = round(random.uniform(70, 95), 2)
        
        cursor.execute(
            """INSERT INTO predictions 
            (stock_id, prediction_date, predicted_price, confidence_score, algorithm_used)
            VALUES (%s, CURDATE(), %s, %s, 'random_forest')""",
            (stock_id, Decimal(str(predicted_price)), Decimal(str(confidence)))
        )
    
    print("Generated new predictions")

def main():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        print("Successfully connected to database")
        
        clear_old_data(cursor)
        generate_new_data(cursor, datetime.now() - timedelta(days=100))
        generate_predictions(cursor)
        
        conn.commit()
        print("Successfully updated database")
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        if 'conn' in locals():
            conn.rollback()
    except Exception as e:
        print(f"Unexpected error: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    main()