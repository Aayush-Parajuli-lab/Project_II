-- Stock Prediction App Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS stock_prediction_db;
USE stock_prediction_db;

-- Stocks table to store basic stock information
CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    market_cap BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Historical stock data table
CREATE TABLE IF NOT EXISTS historical_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stock_id INT NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(10, 2) NOT NULL,
    high_price DECIMAL(10, 2) NOT NULL,
    low_price DECIMAL(10, 2) NOT NULL,
    close_price DECIMAL(10, 2) NOT NULL,
    volume BIGINT NOT NULL,
    adj_close DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stock_date (stock_id, date)
);

-- Stock predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stock_id INT NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_price DECIMAL(10, 2) NOT NULL,
    confidence_score DECIMAL(5, 2), -- 0.00 to 100.00
    prediction_type ENUM('short_term', 'medium_term', 'long_term') DEFAULT 'short_term',
    algorithm_used VARCHAR(50) DEFAULT 'moving_average',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Users table for tracking user preferences
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stock_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_stock (user_id, stock_id)
);

-- Insert some sample stocks
INSERT IGNORE INTO stocks (symbol, company_name, sector) VALUES 
('AAPL', 'Apple Inc.', 'Technology'),
('GOOGL', 'Alphabet Inc.', 'Technology'),
('MSFT', 'Microsoft Corporation', 'Technology'),
('AMZN', 'Amazon.com Inc.', 'E-commerce'),
('TSLA', 'Tesla Inc.', 'Automotive'),
('NVDA', 'NVIDIA Corporation', 'Technology'),
('META', 'Meta Platforms Inc.', 'Technology'),
('NFLX', 'Netflix Inc.', 'Entertainment'),
('DIS', 'The Walt Disney Company', 'Entertainment'),
('V', 'Visa Inc.', 'Financial Services');

-- Create indexes for better performance
CREATE INDEX idx_historical_date ON historical_data(date);
CREATE INDEX idx_historical_stock_date ON historical_data(stock_id, date);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);
CREATE INDEX idx_predictions_stock ON predictions(stock_id);