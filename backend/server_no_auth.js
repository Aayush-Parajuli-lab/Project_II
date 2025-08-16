/**
 * Stock Prediction App Backend Server - Information Sharing Platform
 * 
 * This server provides:
 * - RESTful API for stock data management (PUBLIC - no login required)
 * - Random Forest algorithm for stock price prediction
 * - Multiple sorting algorithms for stock data
 * - Real-time stock data fetching from Yahoo Finance
 * - MySQL database integration
 * - CORS enabled for frontend integration
 * - Admin panel for system management (requires login)
 * 
 * Author: Stock Prediction App
 * Version: 2.0.0 - Information Sharing Platform
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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import passport, { isGoogleAuthConfigured } from './config/googleAuth.js';
import NinjaStockAPI from './services/ninjaStockAPI.js';
import AlphaVantageAPI from './services/alphaVantageAPI.js';
import { StockRandomForest } from './algorithms/randomForest.js';
import { StockSorter } from './utils/sortingAlgorithms.js';
import { getFirebaseAuth } from './services/firebaseAdmin.js';
import { predictWithPython } from './services/pythonPredictor.js';

// Load environment variables
dotenv.config();

// Demo mode flags
const DEMO_MODE_REQUESTED = (process.env.DEMO_MODE || '').toString().toLowerCase() === 'true' || process.env.DEMO_MODE === '1';
let DEMO_MODE_ACTIVE = false;
const STATIC_MODE = (process.env.STATIC_MODE || '').toString().toLowerCase() === 'true' || process.env.STATIC_MODE === '1';
const NO_EXTERNAL_APIS = STATIC_MODE || (process.env.NO_EXTERNAL_APIS || '').toString().toLowerCase() === 'true' || process.env.NO_EXTERNAL_APIS === '1';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8081;

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration (kept for admin only)
app.use(session({
    secret: process.env.SESSION_SECRET || 'stock-predict-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport middleware (kept for admin only)
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
const alphaAPI = new AlphaVantageAPI();

// JWT Secret (kept for admin only)
const JWT_SECRET = process.env.JWT_SECRET || 'stock-predict-jwt-secret';

/**
 * Admin Authentication Middleware (kept for admin panel)
 */
const authenticateAdminToken = (req, res, next) => {
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
        
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        req.user = user;
        next();
    });
};

/**
 * Admin Role Requirement Middleware
 */
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
};

// Database connection
let db;

const connectDB = async () => {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'stock_prediction_db',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('✅ Connected to MySQL database');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// ============================================================================
// PUBLIC API ENDPOINTS (No authentication required)
// ============================================================================

/**
 * GET /api/health
 * Server health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'StockVision Pro API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        mode: 'Information Sharing Platform'
    });
});

/**
 * GET /api/stocks
 * Get all stocks (PUBLIC - no login required)
 */
app.get('/api/stocks', async (req, res) => {
    try {
        const { sortBy = 'symbol', order = 'asc', limit = 100 } = req.query;
        
        let query = 'SELECT * FROM stocks';
        const params = [];
        
        // Add sorting
        const allowedSortFields = ['symbol', 'company_name', 'sector', 'market_cap', 'created_at'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'symbol';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        if (limit && !isNaN(limit)) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }
        
        const [rows] = await db.execute(query, params);
        
        res.json({
            success: true,
            data: rows,
            count: rows.length,
            sortBy: sortField,
            order: sortOrder
        });
    } catch (error) {
        console.error('❌ Error fetching stocks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stocks',
            details: error.message
        });
    }
});

/**
 * GET /api/stocks/:symbol
 * Get specific stock details (PUBLIC - no login required)
 */
app.get('/api/stocks/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        const [rows] = await db.execute(
            'SELECT * FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }
        
        const stock = rows[0];
        
        // Get historical data
        const [historicalRows] = await db.execute(
            'SELECT * FROM historical_data WHERE stock_id = ? ORDER BY date DESC LIMIT 30',
            [stock.id]
        );
        
        // Get recent predictions
        const [predictionRows] = await db.execute(
            'SELECT * FROM predictions WHERE stock_id = ? ORDER BY prediction_date DESC LIMIT 10',
            [stock.id]
        );
        
        res.json({
            success: true,
            data: {
                ...stock,
                historical_data: historicalRows,
                predictions: predictionRows
            }
        });
    } catch (error) {
        console.error('❌ Error fetching stock details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stock details',
            details: error.message
        });
    }
});

/**
 * POST /api/predict/:symbol
 * Generate stock prediction (PUBLIC - no login required)
 */
app.post('/api/predict/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        // Get stock data
        const [stockRows] = await db.execute(
            'SELECT * FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (stockRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }
        
        const stock = stockRows[0];
        
        // Get historical data for prediction
        const [historicalRows] = await db.execute(
            'SELECT * FROM historical_data WHERE stock_id = ? ORDER BY date ASC',
            [stock.id]
        );
        
        if (historicalRows.length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient historical data for prediction. Need at least 50 data points.',
                currentDataPoints: historicalRows.length
            });
        }
        
        // Generate prediction using Random Forest
        const prediction = await randomForest.predict(historicalRows);
        
        // Save prediction to database
        const [result] = await db.execute(
            'INSERT INTO predictions (stock_id, prediction_date, predicted_price, confidence_score, prediction_type, algorithm_used) VALUES (?, ?, ?, ?, ?, ?)',
            [stock.id, new Date(), prediction.predictedPrice, prediction.confidence, 'short_term', 'random_forest']
        );
        
        res.json({
            success: true,
            data: {
                symbol: stock.symbol,
                company: stock.company_name,
                prediction: prediction.predictedPrice,
                confidence: prediction.confidence,
                predictionId: result.insertId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error generating prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate prediction',
            details: error.message
        });
    }
});

/**
 * GET /api/predictions/:symbol
 * Get stock predictions (PUBLIC - no login required)
 */
app.get('/api/predictions/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 20 } = req.query;
        
        const [stockRows] = await db.execute(
            'SELECT * FROM stocks WHERE symbol = ?',
            [symbol.toUpperCase()]
        );
        
        if (stockRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Stock not found'
            });
        }
        
        const stock = stockRows[0];
        
        const [rows] = await db.execute(
            'SELECT * FROM predictions WHERE stock_id = ? ORDER BY prediction_date DESC LIMIT ?',
            [stock.id, parseInt(limit)]
        );
        
        res.json({
            success: true,
            data: {
                symbol: stock.symbol,
                company: stock.company_name,
                predictions: rows
            }
        });
    } catch (error) {
        console.error('❌ Error fetching predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch predictions',
            details: error.message
        });
    }
});

/**
 * POST /api/sort/stocks
 * Sort stocks using various algorithms (PUBLIC - no login required)
 */
app.post('/api/sort/stocks', async (req, res) => {
    try {
        const { algorithm = 'smart', criteria = 'symbol', data } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Stock data array is required'
            });
        }
        
        const sortedData = stockSorter.sort(data, algorithm, criteria);
        const performance = stockSorter.getPerformanceMetrics();
        
        res.json({
            success: true,
            data: sortedData,
            algorithm,
            criteria,
            performance
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
 * Get sorting algorithm performance benchmark (PUBLIC - no login required)
 */
app.get('/api/sort/algorithms/benchmark', async (req, res) => {
    try {
        const benchmark = stockSorter.runBenchmark();
        
        res.json({
            success: true,
            data: benchmark
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
 * Get available sorting criteria (PUBLIC - no login required)
 */
app.get('/api/sort/criteria', (req, res) => {
    res.json({
        success: true,
        data: [
            'symbol',
            'company_name',
            'sector',
            'market_cap',
            'created_at'
        ]
    });
});

/**
 * POST /api/fetch-realtime/:symbol
 * Fetch real-time stock data (PUBLIC - no login required)
 */
app.post('/api/fetch-realtime/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        if (NO_EXTERNAL_APIS) {
            return res.json({
                success: true,
                data: {
                    symbol: symbol.toUpperCase(),
                    price: Math.random() * 1000 + 50,
                    change: (Math.random() - 0.5) * 20,
                    changePercent: (Math.random() - 0.5) * 5,
                    volume: Math.floor(Math.random() * 1000000),
                    timestamp: new Date().toISOString(),
                    mode: 'static'
                }
            });
        }
        
        const data = await ninjaAPI.getQuote(symbol);
        
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('❌ Error fetching real-time data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch real-time data',
            details: error.message
        });
    }
});

/**
 * GET /api/model/info
 * Get ML model information (PUBLIC - no login required)
 */
app.get('/api/model/info', (req, res) => {
    res.json({
        success: true,
        data: {
            algorithm: 'Random Forest',
            nEstimators: 100,
            maxDepth: 10,
            minSamplesLeaf: 1,
            features: [
                'SMA_5', 'SMA_10', 'SMA_20',
                'EMA_12', 'EMA_26',
                'RSI_14', 'Volatility', 'Volume_Ratio',
                'Momentum', 'Price_Change_Percent'
            ],
            description: 'Advanced Random Forest model for stock price prediction using technical indicators'
        }
    });
});

// ============================================================================
// ADMIN API ENDPOINTS (Requires admin authentication)
// ============================================================================

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
        
        // Check admin credentials
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ? AND role = "admin"',
            [username]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid admin credentials'
            });
        }
        
        const admin = rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid admin credentials'
            });
        }
        
        // Generate admin token
        const payload = {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role
        };
        
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            success: true,
            data: {
                token,
                user: payload
            }
        });
    } catch (error) {
        console.error('❌ Error during admin login:', error);
        res.status(500).json({
            success: false,
            error: 'Admin login failed',
            details: error.message
        });
    }
});

/**
 * GET /api/admin/verify
 * Verify admin token
 */
app.get('/api/admin/verify', authenticateAdminToken, (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user,
            message: 'Admin token verified'
        }
    });
});

/**
 * POST /api/admin/logout
 * Admin logout endpoint
 */
app.post('/api/admin/logout', authenticateAdminToken, requireAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('❌ Error during admin logout:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            details: error.message
        });
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 StockVision Pro Information Sharing Platform running on port ${PORT}`);
    console.log(`📊 All stock endpoints are now PUBLIC - no login required`);
    console.log(`🔐 Admin panel available at /api/admin/* (requires authentication)`);
    console.log(`🌐 Frontend should be accessible at http://localhost:3000`);
});

export default app;