/**
 * Stock Prediction App Backend Server
 * 
 * This server provides:
 * - RESTful API for stock data management
 * - Random Forest algorithm for stock price prediction
 * - Multiple sorting algorithms for stock data
 * - Real-time stock data fetching from Yahoo Finance
 * - MySQL database integration
 * - CORS enabled for frontend integration
 * 
 * Author: Stock Prediction App
 * Version: 1.0.0
 */

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cron from 'node-cron';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from './config/googleAuth.js';
import NinjaStockAPI from './services/ninjaStockAPI.js';
import { StockRandomForest } from './algorithms/randomForest.js';
import { StockSorter } from './utils/sortingAlgorithms.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8081;

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'stock-predict-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration for frontend integration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize algorithm instances and services
const randomForest = new StockRandomForest({
    nEstimators: 100,
    maxDepth: 10,
    minSamplesLeaf: 1
});

const stockSorter = new StockSorter();
const ninjaAPI = new NinjaStockAPI();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'stock-predict-jwt-secret';

/**
 * Authentication Middleware
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

/**
 * Admin Authorization Middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

/**
 * Log admin activity
 */
const logAdminActivity = async (adminId, action, targetTable = null, targetId = null, details = null, ipAddress = null) => {
    try {
        await db.execute(
            `INSERT INTO admin_logs (admin_id, action, target_table, target_id, details, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [adminId, action, targetTable, targetId, JSON.stringify(details), ipAddress]
        );
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
};

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stock_prediction_db',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
};

// Create database connection pool
let db;

async function initializeDatabase() {
    try {
        console.log('🔌 Connecting to MySQL database...');
        db = await mysql.createPool(dbConfig);
        
        // Test the connection
        const connection = await db.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        // Initialize database schema if needed
        await initializeSchema();
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('💡 Make sure MySQL is running and database exists');
        process.exit(1);
    }
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
    try {
        console.log('📋 Initializing database schema...');
        
        // Check if stocks table exists, create if not
        const [tables] = await db.execute(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'stocks'",
            [dbConfig.database]
        );
        
        if (tables[0].count === 0) {
            console.log('🏗️ Creating database tables...');
            // Read and execute schema file would go here
            // For now, we'll assume the schema exists
            console.log('⚠️ Please run the database_schema.sql file to create tables');
        }
        
    } catch (error) {
        console.error('❌ Schema initialization failed:', error.message);
    }
}

/**
 * ===========================================
 * AUTHENTICATION ENDPOINTS
 * ===========================================
 */

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        console.log(`🔐 Admin login attempt for: ${username}`);

        // Get user from database
        const [users] = await db.execute(
            'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? AND role = "admin"',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        // For demo purposes, we'll use a simple password check
        // In production, use bcrypt.compare(password, user.password_hash)
        const isValidPassword = password === 'admin123'; // Demo password

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last login
        await db.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log admin activity
        await logAdminActivity(user.id, 'LOGIN', null, null, null, req.ip);

        console.log(`✅ Admin login successful for: ${username}`);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('❌ Error during admin login:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            details: error.message
        });
    }
});

/**
 * POST /api/admin/logout
 * Admin logout endpoint
 */
app.post('/api/admin/logout', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Log admin activity
        await logAdminActivity(req.user.id, 'LOGOUT', null, null, null, req.ip);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('❌ Error during logout:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

/**
 * GET /api/admin/verify
 * Verify admin token
 */
app.get('/api/admin/verify', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role
            }
        }
    });
});

/**
 * ===========================================
 * ADMIN PANEL ENDPOINTS
 * ===========================================
 */

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📊 Fetching admin dashboard statistics...');

        // Get various statistics
        const [stockCount] = await db.execute('SELECT COUNT(*) as count FROM stocks');
        const [predictionCount] = await db.execute('SELECT COUNT(*) as count FROM predictions');
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [recentPredictions] = await db.execute(
            `SELECT p.*, s.symbol, s.company_name 
             FROM predictions p 
             JOIN stocks s ON p.stock_id = s.id 
             ORDER BY p.created_at DESC 
             LIMIT 10`
        );
        const [recentActivity] = await db.execute(
            `SELECT al.*, u.username 
             FROM admin_logs al 
             JOIN users u ON al.admin_id = u.id 
             ORDER BY al.created_at DESC 
             LIMIT 20`
        );

        // Get prediction accuracy stats
        const [accuracyStats] = await db.execute(
            `SELECT 
                AVG(confidence_score) as avg_confidence,
                COUNT(CASE WHEN confidence_score >= 70 THEN 1 END) as high_confidence_count,
                COUNT(*) as total_predictions
             FROM predictions 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );

        res.json({
            success: true,
            data: {
                statistics: {
                    totalStocks: stockCount[0].count,
                    totalPredictions: predictionCount[0].count,
                    totalUsers: userCount[0].count,
                    averageConfidence: accuracyStats[0]?.avg_confidence || 0,
                    highConfidencePredictions: accuracyStats[0]?.high_confidence_count || 0
                },
                recentPredictions,
                recentActivity
            }
        });

    } catch (error) {
        console.error('❌ Error fetching admin dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data',
            details: error.message
        });
    }
});

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [users] = await db.execute(
            `SELECT id, username, email, role, is_active, last_login, created_at 
             FROM users 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM users');

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount[0].count,
                    pages: Math.ceil(totalCount[0].count / limit)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
        });
    }
});

/**
 * PUT /api/admin/users/:id
 * Update user status or role
 */
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, role } = req.body;

        const updates = [];
        const values = [];

        if (typeof is_active === 'boolean') {
            updates.push('is_active = ?');
            values.push(is_active);
        }

        if (role && ['user', 'admin'].includes(role)) {
            updates.push('role = ?');
            values.push(role);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid updates provided'
            });
        }

        values.push(id);

        const [result] = await db.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Log admin activity
        await logAdminActivity(
            req.user.id, 
            'UPDATE_USER', 
            'users', 
            id, 
            { is_active, role }, 
            req.ip
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            details: error.message
        });
    }
});

/**
 * DELETE /api/admin/stocks/:id
 * Delete a stock (admin only)
 */
app.delete('/api/admin/stocks/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute('DELETE FROM stocks WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }

        // Log admin activity
        await logAdminActivity(
            req.user.id, 
            'DELETE_STOCK', 
            'stocks', 
            id, 
            null, 
            req.ip
        );

        res.json({
            success: true,
            message: 'Stock deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting stock:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete stock',
            details: error.message
        });
    }
});

/**
 * GET /api/admin/settings
 * Get system settings
 */
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [settings] = await db.execute('SELECT * FROM system_settings ORDER BY setting_key');

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings',
            details: error.message
        });
    }
});

/**
 * PUT /api/admin/settings/:key
 * Update system setting
 */
app.put('/api/admin/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({
                success: false,
                error: 'Setting value is required'
            });
        }

        const [result] = await db.execute(
            'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
            [value, req.user.id, key]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Setting not found'
            });
        }

        // Log admin activity
        await logAdminActivity(
            req.user.id, 
            'UPDATE_SETTING', 
            'system_settings', 
            null, 
            { setting_key: key, new_value: value }, 
            req.ip
        );

        res.json({
            success: true,
            message: 'Setting updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating setting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update setting',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * GOOGLE OAUTH ENDPOINTS
 * ===========================================
 */

// Google OAuth login route
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback route
app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect or send token
        const token = jwt.sign(
            { 
                id: req.user.googleId, 
                email: req.user.email,
                name: req.user.name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Redirect to frontend with token
        res.redirect(`http://localhost:3000/auth/success?token=${token}`);
    }
);

// Get current user info
app.get('/api/auth/user', authenticateToken, (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Error logging out'
            });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Error destroying session'
                });
            }
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    });
});

/**
 * ===========================================
 * STOCK DATA ENDPOINTS
 * ===========================================
 */

/**
 * GET /api/stocks
 * Get all stocks with optional sorting and filtering
 */
app.get('/api/stocks', async (req, res) => {
    try {
        console.log('📊 Fetching stocks data...');
        
        const { 
            sortBy = 'symbol_asc', 
            algorithm = 'smart', 
            sector = null,
            limit = 100,
            offset = 0 
        } = req.query;
        
        // Build query with optional filtering
        let query = 'SELECT * FROM stocks';
        let params = [];
        
        if (sector) {
            query += ' WHERE sector = ?';
            params.push(sector);
        }
        
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [stocks] = await db.execute(query, params);
        
        // Apply sorting if requested
        if (sortBy !== 'none') {
            const sortResult = stockSorter.smartSort(stocks, sortBy, algorithm === 'smart' ? null : algorithm);
            
            res.json({
                success: true,
                data: sortResult.sortedData,
                meta: {
                    total: stocks.length,
                    sortedBy: sortBy,
                    algorithm: sortResult.algorithm,
                    executionTime: sortResult.executionTime,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        } else {
            res.json({
                success: true,
                data: stocks,
                meta: {
                    total: stocks.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error fetching stocks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stocks data',
            details: error.message
        });
    }
});

/**
 * GET /api/stocks/:symbol
 * Get specific stock information with recent data
 */
app.get('/api/stocks/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log(`📈 Fetching data for stock: ${symbol}`);
        
        // Get stock basic info
        const [stocks] = await db.execute(
            'SELECT * FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }
        
        const stock = stocks[0];
        
        // Get recent historical data (last 30 days)
        const [historicalData] = await db.execute(
            `SELECT * FROM historical_data 
             WHERE stock_id = ? 
             ORDER BY date DESC 
             LIMIT 30`,
            [stock.id]
        );
        
        // Get latest predictions
        const [predictions] = await db.execute(
            `SELECT * FROM predictions 
             WHERE stock_id = ? 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [stock.id]
        );
        
        res.json({
            success: true,
            data: {
                stock: stock,
                historicalData: historicalData.reverse(), // Oldest first for chart display
                predictions: predictions
            }
        });
        
    } catch (error) {
        console.error(`❌ Error fetching stock ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stock data',
            details: error.message
        });
    }
});

/**
 * POST /api/stocks
 * Add a new stock to the database
 */
app.post('/api/stocks', async (req, res) => {
    try {
        const { symbol, company_name, sector } = req.body;
        
        if (!symbol || !company_name) {
            return res.status(400).json({
                success: false,
                error: 'Symbol and company name are required'
            });
        }
        
        console.log(`➕ Adding new stock: ${symbol}`);
        
        // Insert new stock
        const [result] = await db.execute(
            'INSERT INTO stocks (symbol, company_name, sector) VALUES (?, ?, ?)',
            [symbol.toUpperCase(), company_name, sector || null]
        );
        
        // Fetch the created stock
        const [newStock] = await db.execute(
            'SELECT * FROM stocks WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            data: newStock[0],
            message: 'Stock added successfully'
        });
        
    } catch (error) {
        console.error('❌ Error adding stock:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                error: 'Stock symbol already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to add stock',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * PREDICTION ENDPOINTS
 * ===========================================
 */

/**
 * POST /api/predict/:symbol
 * Generate prediction for a specific stock using Random Forest
 */
app.post('/api/predict/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days_ahead = 1, retrain = false } = req.body;
        
        console.log(`🔮 Generating prediction for ${symbol}...`);
        
        // Get stock ID
        const [stocks] = await db.execute(
            'SELECT id FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }
        
        const stockId = stocks[0].id;
        
        // Get historical data for training/prediction
        const [historicalData] = await db.execute(
            `SELECT date, open_price, high_price, low_price, close_price, volume, adj_close
             FROM historical_data 
             WHERE stock_id = ? 
             ORDER BY date ASC`,
            [stockId]
        );
        
        if (historicalData.length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient historical data for prediction (minimum 50 data points required)'
            });
        }
        
        // Train model if not trained or retrain requested
        if (!randomForest.isTrained || retrain) {
            console.log('🌲 Training Random Forest model...');
            const trainingResult = randomForest.train(historicalData);
            
            if (!trainingResult.success) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to train prediction model',
                    details: trainingResult.error
                });
            }
        }
        
        // Make prediction
        const predictionResult = randomForest.predict(historicalData, days_ahead);
        
        if (!predictionResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate prediction',
                details: predictionResult.error
            });
        }
        
        // Save prediction to database
        const predictionDate = new Date();
        predictionDate.setDate(predictionDate.getDate() + days_ahead);
        
        await db.execute(
            `INSERT INTO predictions 
             (stock_id, prediction_date, predicted_price, confidence_score, prediction_type, algorithm_used)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                stockId,
                predictionDate.toISOString().split('T')[0],
                predictionResult.predictedPrice,
                predictionResult.confidence,
                days_ahead <= 1 ? 'short_term' : days_ahead <= 7 ? 'medium_term' : 'long_term',
                'random_forest'
            ]
        );
        
        console.log(`✅ Prediction generated for ${symbol}: $${predictionResult.predictedPrice}`);
        
        res.json({
            success: true,
            data: {
                symbol: symbol,
                prediction: predictionResult,
                modelInfo: randomForest.getModelInfo()
            }
        });
        
    } catch (error) {
        console.error(`❌ Error generating prediction for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate prediction',
            details: error.message
        });
    }
});

/**
 * GET /api/predictions/:symbol
 * Get historical predictions for a stock
 */
app.get('/api/predictions/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 10 } = req.query;
        
        console.log(`📊 Fetching predictions for ${symbol}...`);
        
        const [predictions] = await db.execute(
            `SELECT p.*, s.symbol, s.company_name
             FROM predictions p
             JOIN stocks s ON p.stock_id = s.id
             WHERE s.symbol = ?
             ORDER BY p.created_at DESC
             LIMIT ?`,
            [symbol.toUpperCase(), parseInt(limit)]
        );
        
        res.json({
            success: true,
            data: predictions
        });
        
    } catch (error) {
        console.error(`❌ Error fetching predictions for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch predictions',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * SORTING ENDPOINTS
 * ===========================================
 */

/**
 * POST /api/sort/stocks
 * Sort stocks using various algorithms
 */
app.post('/api/sort/stocks', async (req, res) => {
    try {
        const { 
            sortBy = 'symbol_asc', 
            algorithm = 'smart',
            criteria = null 
        } = req.body;
        
        console.log(`🔀 Sorting stocks by ${sortBy} using ${algorithm} algorithm`);
        
        // Get all stocks
        const [stocks] = await db.execute('SELECT * FROM stocks');
        
        let sortResult;
        
        if (criteria && Array.isArray(criteria)) {
            // Multi-criteria sorting
            sortResult = {
                sortedData: stockSorter.multiSort(stocks, criteria),
                algorithm: 'multi-criteria',
                executionTime: 0,
                itemCount: stocks.length,
                sortCriteria: criteria.join(' -> ')
            };
        } else {
            // Single criteria sorting
            sortResult = stockSorter.smartSort(stocks, sortBy, algorithm === 'smart' ? null : algorithm);
        }
        
        res.json({
            success: true,
            data: sortResult.sortedData,
            meta: {
                algorithm: sortResult.algorithm,
                executionTime: sortResult.executionTime,
                itemCount: sortResult.itemCount,
                sortCriteria: sortResult.sortCriteria,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error sorting stocks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sort stocks',
            details: error.message
        });
    }
});

/**
 * GET /api/sort/algorithms/benchmark
 * Benchmark different sorting algorithms
 */
app.get('/api/sort/algorithms/benchmark', async (req, res) => {
    try {
        const { sortBy = 'symbol_asc' } = req.query;
        
        console.log('🏁 Running sorting algorithm benchmark...');
        
        const [stocks] = await db.execute('SELECT * FROM stocks');
        const benchmarkResults = stockSorter.benchmarkAlgorithms(stocks, sortBy);
        
        res.json({
            success: true,
            data: {
                results: benchmarkResults,
                itemCount: stocks.length,
                sortCriteria: sortBy,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Error running benchmark:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run benchmark',
            details: error.message
        });
    }
});

/**
 * GET /api/sort/criteria
 * Get available sorting criteria
 */
app.get('/api/sort/criteria', (req, res) => {
    try {
        const criteria = stockSorter.getAvailableSortCriteria();
        
        res.json({
            success: true,
            data: criteria
        });
        
    } catch (error) {
        console.error('❌ Error fetching sort criteria:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sort criteria',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * REAL-TIME DATA ENDPOINTS
 * ===========================================
 */

/**
 * POST /api/fetch-realtime/:symbol
 * Fetch real-time data from Ninja API
 */
app.post('/api/fetch-realtime/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        console.log(`🌐 Fetching real-time data for ${symbol} from Ninja API...`);
        
        // Fetch from Ninja API
        const quote = await ninjaAPI.getStockQuote(symbol);
        
        if (!quote) {
            return res.status(404).json({
                success: false,
                error: 'Stock data not found'
            });
        }
        
        // Update stock in database if exists
        const [stocks] = await db.execute(
            'SELECT id FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (stocks.length > 0) {
            await db.execute(
                'UPDATE stocks SET market_cap = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [quote.marketCap || null, stocks[0].id]
            );
        }
        
        res.json({
            success: true,
            data: {
                symbol: quote.symbol,
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
                volume: quote.volume,
                marketCap: quote.marketCap,
                dayHigh: quote.high,
                dayLow: quote.low,
                timestamp: quote.timestamp
            }
        });
        
    } catch (error) {
        console.error(`❌ Error fetching real-time data for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch real-time data',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * UTILITY ENDPOINTS
 * ===========================================
 */

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await db.execute('SELECT 1');
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                randomForest: randomForest.isTrained ? 'trained' : 'not_trained',
                sorting: 'available'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/model/info
 * Get Random Forest model information
 */
app.get('/api/model/info', (req, res) => {
    try {
        const modelInfo = randomForest.getModelInfo();
        
        res.json({
            success: true,
            data: modelInfo
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get model info',
            details: error.message
        });
    }
});

/**
 * ===========================================
 * SCHEDULED TASKS
 * ===========================================
 */

/**
 * Daily task to update stock data
 * Runs every day at 6 PM (after market close)
 */
cron.schedule('0 18 * * 1-5', async () => {
    console.log('📅 Running daily stock data update...');
    
    try {
        const [stocks] = await db.execute('SELECT symbol FROM stocks LIMIT 10');
        
        for (const stock of stocks) {
            try {
                // Fetch latest data from Ninja API
                const quote = await ninjaAPI.getStockQuote(stock.symbol);
                
                if (quote && quote.price) {
                    // Add to historical data
                    await db.execute(
                        `INSERT IGNORE INTO historical_data 
                         (stock_id, date, open_price, high_price, low_price, close_price, volume, adj_close)
                         SELECT id, CURDATE(), ?, ?, ?, ?, ?, ?
                         FROM stocks WHERE symbol = ?`,
                        [
                            quote.open || quote.price,
                            quote.high || quote.price,
                            quote.low || quote.price,
                            quote.price,
                            quote.volume || 0,
                            quote.price,
                            stock.symbol
                        ]
                    );
                }
                
                // Small delay to respect API limits
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error updating ${stock.symbol}:`, error.message);
            }
        }
        
        console.log('✅ Daily stock data update completed');
        
    } catch (error) {
        console.error('❌ Daily update failed:', error);
    }
});

/**
 * ===========================================
 * ERROR HANDLING & SERVER STARTUP
 * ===========================================
 */

// Global error handler
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Start server
async function startServer() {
    try {
        // Initialize database connection
        await initializeDatabase();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('\n🚀 Stock Prediction Server Started!');
            console.log(`📡 Server running on http://localhost:${PORT}`);
            console.log(`🗄️  Database: ${dbConfig.database}`);
            console.log(`🌲 Random Forest: ${randomForest.isTrained ? 'Ready' : 'Needs Training'}`);
            console.log(`🔀 Sorting Algorithms: Available`);
            console.log('\n📋 Available Endpoints:');
            console.log('   GET  /api/health           - Health check');
            console.log('   GET  /api/stocks           - Get all stocks (with sorting)');
            console.log('   GET  /api/stocks/:symbol   - Get specific stock');
            console.log('   POST /api/stocks           - Add new stock');
            console.log('   POST /api/predict/:symbol  - Generate prediction');
            console.log('   GET  /api/predictions/:symbol - Get predictions');
            console.log('   POST /api/sort/stocks      - Sort stocks');
            console.log('   GET  /api/sort/criteria    - Get sort criteria');
            console.log('   POST /api/fetch-realtime/:symbol - Fetch real-time data');
            console.log('\n🎯 Ready for frontend connection!\n');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    
    if (db) {
        await db.end();
        console.log('📡 Database connection closed');
    }
    
    console.log('✅ Server shut down gracefully');
    process.exit(0);
});

// Start the server
startServer();
