#!/usr/bin/env python3
"""
Stock Data Generator Script
Generates synthetic historical stock data for testing and development
"""

import json
import random
import datetime
from datetime import timedelta
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class StockDataGenerator:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'stock_prediction_db'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
        
    def connect_db(self):
        """Connect to MySQL database"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            if connection.is_connected():
                print("✅ Connected to MySQL database")
                return connection
        except Error as e:
            print(f"❌ Error connecting to MySQL: {e}")
            return None
    
    def get_stocks(self, connection):
        """Get all stocks from database"""
        try:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id, symbol, company_name FROM stocks")
            stocks = cursor.fetchall()
            cursor.close()
            return stocks
        except Error as e:
            print(f"❌ Error fetching stocks: {e}")
            return []
    
    def generate_historical_data(self, stock_id, symbol, days=365):
        """Generate synthetic historical data for a stock"""
        print(f"📊 Generating {days} days of data for {symbol}...")
        
        # Start with a base price
        base_price = random.uniform(50, 500)
        current_price = base_price
        
        data = []
        start_date = datetime.datetime.now() - timedelta(days=days)
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            
            # Generate realistic price movements
            daily_change = random.uniform(-0.05, 0.05)  # ±5% daily change
            current_price *= (1 + daily_change)
            
            # Generate OHLC data
            open_price = current_price
            high_price = open_price * random.uniform(1.0, 1.03)
            low_price = open_price * random.uniform(0.97, 1.0)
            close_price = current_price
            
            # Generate volume
            volume = random.randint(100000, 5000000)
            
            data.append({
                'stock_id': stock_id,
                'date': date.date(),
                'open_price': round(open_price, 2),
                'high_price': round(high_price, 2),
                'low_price': round(low_price, 2),
                'close_price': round(close_price, 2),
                'volume': volume,
                'adj_close': round(close_price, 2)
            })
        
        return data
    
    def insert_historical_data(self, connection, data):
        """Insert historical data into database"""
        try:
            cursor = connection.cursor()
            
            # Clear existing data for these stocks
            stock_ids = list(set([item['stock_id'] for item in data]))
            for stock_id in stock_ids:
                cursor.execute("DELETE FROM historical_data WHERE stock_id = %s", (stock_id,))
                print(f"🗑️  Cleared existing data for stock ID {stock_id}")
            
            # Insert new data
            insert_query = """
                INSERT INTO historical_data 
                (stock_id, date, open_price, high_price, low_price, close_price, volume, adj_close)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.executemany(insert_query, [
                (item['stock_id'], item['date'], item['open_price'], 
                 item['high_price'], item['low_price'], item['close_price'], 
                 item['volume'], item['adj_close'])
                for item in data
            ])
            
            connection.commit()
            cursor.close()
            print(f"✅ Inserted {len(data)} historical data records")
            return True
            
        except Error as e:
            print(f"❌ Error inserting data: {e}")
            connection.rollback()
            return False
    
    def generate_all_stocks_data(self, days=365):
        """Generate historical data for all stocks"""
        connection = self.connect_db()
        if not connection:
            return False
        
        try:
            stocks = self.get_stocks(connection)
            if not stocks:
                print("❌ No stocks found in database")
                return False
            
            all_data = []
            for stock in stocks:
                stock_data = self.generate_historical_data(
                    stock['id'], 
                    stock['symbol'], 
                    days
                )
                all_data.extend(stock_data)
            
            success = self.insert_historical_data(connection, all_data)
            
            if success:
                print(f"🎉 Successfully generated data for {len(stocks)} stocks")
                print(f"📊 Total records created: {len(all_data)}")
            
            return success
            
        finally:
            if connection.is_connected():
                connection.close()
                print("🔌 Database connection closed")

def main():
    """Main function"""
    print("🚀 Stock Data Generator")
    print("=" * 30)
    
    generator = StockDataGenerator()
    
    # Get user input for days
    try:
        days = int(input("Enter number of days to generate (default 365): ") or "365")
    except ValueError:
        days = 365
    
    print(f"📅 Generating {days} days of historical data...")
    
    success = generator.generate_all_stocks_data(days)
    
    if success:
        print("✅ Data generation completed successfully!")
    else:
        print("❌ Data generation failed!")

if __name__ == "__main__":
    main()