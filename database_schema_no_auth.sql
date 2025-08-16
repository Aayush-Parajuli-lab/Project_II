-- StockVision Pro - Information Sharing Platform Database Schema
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
    algorithm_used VARCHAR(50) DEFAULT 'random_forest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Admin users table (kept for admin panel access)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Insert sample stocks
INSERT IGNORE INTO stocks (symbol, company_name, sector) VALUES 
('AAPL', 'Apple Inc.', 'Technology'),
('GOOGL', 'Alphabet Inc.', 'Technology'),
('MSFT', 'Microsoft Corporation', 'Technology'),
('AMZN', 'Amazon.com Inc.', 'E-commerce'),
('TSLA', 'Tesla Inc.', 'Automotive'),
('NVDA', 'NVIDIA Corporation', 'Technology'),
('META', 'Meta Platforms Inc.', 'Technology'),
('BRK.A', 'Berkshire Hathaway Inc.', 'Financial Services'),
('UNH', 'UnitedHealth Group Inc.', 'Healthcare'),
('JNJ', 'Johnson & Johnson', 'Healthcare');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO admin_users (username, email, password_hash, role) VALUES 
('admin', 'admin@stockvision.com', '$2b$10$rQZ8K9X2Y1W3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5', 'admin');

-- Insert system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
('platform_mode', 'information_sharing', 'Platform operating mode'),
('public_access', 'true', 'Whether stock data is publicly accessible'),
('admin_required', 'true', 'Whether admin login is required for management'),
('api_rate_limit', '1000', 'API requests per hour per IP'),
('prediction_algorithm', 'random_forest', 'Default prediction algorithm');

-- Create indexes for better performance
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_sector ON stocks(sector);
CREATE INDEX idx_historical_data_stock_date ON historical_data(stock_id, date);
CREATE INDEX idx_predictions_stock_date ON predictions(stock_id, prediction_date);
CREATE INDEX idx_admin_users_username ON admin_users(username);