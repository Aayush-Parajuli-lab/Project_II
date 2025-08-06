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

-- Users table for tracking user preferences and admin access
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- Admin activity logs table
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
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

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@stockpredict.ai', '$2b$10$rQJ3qKqE7yPXg8qKqE7yPOu9l5H3qKqE7yPXg8qKqE7yPOu9l5H3qK', 'admin');

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
('app_name', 'StockPredict AI', 'Application name displayed in UI'),
('max_predictions_per_day', '100', 'Maximum predictions allowed per day'),
('enable_real_time_data', 'true', 'Enable real-time stock data fetching'),
('prediction_confidence_threshold', '70', 'Minimum confidence for displaying predictions'),
('auto_retrain_model', 'true', 'Automatically retrain ML model with new data');

-- Create indexes for better performance
CREATE INDEX idx_historical_date ON historical_data(date);
CREATE INDEX idx_historical_stock_date ON historical_data(stock_id, date);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);
CREATE INDEX idx_predictions_stock ON predictions(stock_id);