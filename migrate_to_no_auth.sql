-- Migration Script: Remove User Authentication Tables
-- Run this script to convert your existing database to information sharing platform

USE stock_prediction_db;

-- Drop user authentication related tables
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS users;

-- Rename admin_users table if it doesn't exist
-- (This handles the case where the old users table had admin users)
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

-- Insert default admin user if not exists
-- Default credentials: admin / admin123
INSERT IGNORE INTO admin_users (username, email, password_hash, role) VALUES 
('admin', 'admin@stockvision.com', '$2b$10$rQZ8K9X2Y1W3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5', 'admin');

-- Update system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
('platform_mode', 'information_sharing', 'Platform operating mode'),
('public_access', 'true', 'Whether stock data is publicly accessible'),
('admin_required', 'true', 'Whether admin login is required for management'),
('api_rate_limit', '1000', 'API requests per hour per IP'),
('prediction_algorithm', 'random_forest', 'Default prediction algorithm');

-- Update existing predictions table algorithm field
UPDATE predictions SET algorithm_used = 'random_forest' WHERE algorithm_used = 'moving_average';

-- Verify migration
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_stocks FROM stocks;
SELECT COUNT(*) as total_predictions FROM predictions;
SELECT COUNT(*) as admin_users FROM admin_users;