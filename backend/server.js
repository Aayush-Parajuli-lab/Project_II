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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import passport, { isGoogleAuthConfigured } from './config/googleAuth.js';
import NinjaStockAPI from './services/ninjaStockAPI.js';
import AlphaVantageAPI from './services/alphaVantageAPI.js';
import { StockRandomForest } from './algorithms/randomForest.js';
import { StockSorter } from './utils/sortingAlgorithms.js';

// Load environment variables
dotenv.config();

// Demo mode flags
const DEMO_MODE_REQUESTED = (process.env.DEMO_MODE || '').toString().toLowerCase() === 'true' || process.env.DEMO_MODE === '1';
let DEMO_MODE_ACTIVE = false;

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
const alphaAPI = new AlphaVantageAPI();

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
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 60000
};

// Create database connection pool
let db;

// Demo DB implementation
function createDemoDb() {
    console.log('🧪 Starting in DEMO MODE with in-memory data. No MySQL required.');
    DEMO_MODE_ACTIVE = true;
    const now = new Date();
    let autoId = 1000;
    const nextId = () => ++autoId;
    const stocks = [
        { id: 1, symbol: 'AAPL', company_name: 'Apple Inc.', sector: 'Technology', market_cap: 2500000000000, created_at: now, updated_at: now },
        { id: 2, symbol: 'GOOGL', company_name: 'Alphabet Inc.', sector: 'Technology', market_cap: 1800000000000, created_at: now, updated_at: now },
        { id: 3, symbol: 'MSFT', company_name: 'Microsoft Corporation', sector: 'Technology', market_cap: 2900000000000, created_at: now, updated_at: now },
        { id: 4, symbol: 'AMZN', company_name: 'Amazon.com Inc.', sector: 'E-commerce', market_cap: 1600000000000, created_at: now, updated_at: now },
        { id: 5, symbol: 'TSLA', company_name: 'Tesla Inc.', sector: 'Automotive', market_cap: 800000000000, created_at: now, updated_at: now },
        { id: 6, symbol: 'NVDA', company_name: 'NVIDIA Corporation', sector: 'Technology', market_cap: 2500000000000, created_at: now, updated_at: now },
        { id: 7, symbol: 'META', company_name: 'Meta Platforms Inc.', sector: 'Technology', market_cap: 1000000000000, created_at: now, updated_at: now },
        { id: 8, symbol: 'NFLX', company_name: 'Netflix Inc.', sector: 'Entertainment', market_cap: 200000000000, created_at: now, updated_at: now },
        { id: 9, symbol: 'DIS', company_name: 'The Walt Disney Company', sector: 'Entertainment', market_cap: 180000000000, created_at: now, updated_at: now },
        { id: 10, symbol: 'V', company_name: 'Visa Inc.', sector: 'Financial Services', market_cap: 500000000000, created_at: now, updated_at: now },
        { id: 11, symbol: 'MA', company_name: 'Mastercard Incorporated', sector: 'Financial Services', market_cap: 450000000000, created_at: now, updated_at: now },
        { id: 12, symbol: 'JPM', company_name: 'JPMorgan Chase & Co.', sector: 'Financial Services', market_cap: 450000000000, created_at: now, updated_at: now },
        { id: 13, symbol: 'BAC', company_name: 'Bank of America Corporation', sector: 'Financial Services', market_cap: 300000000000, created_at: now, updated_at: now },
        { id: 14, symbol: 'XOM', company_name: 'Exxon Mobil Corporation', sector: 'Energy', market_cap: 450000000000, created_at: now, updated_at: now },
        { id: 15, symbol: 'CVX', company_name: 'Chevron Corporation', sector: 'Energy', market_cap: 300000000000, created_at: now, updated_at: now },
        { id: 16, symbol: 'KO', company_name: 'The Coca-Cola Company', sector: 'Consumer Defensive', market_cap: 260000000000, created_at: now, updated_at: now },
        { id: 17, symbol: 'PEP', company_name: 'PepsiCo, Inc.', sector: 'Consumer Defensive', market_cap: 240000000000, created_at: now, updated_at: now },
        { id: 18, symbol: 'PG', company_name: 'Procter & Gamble Company', sector: 'Consumer Defensive', market_cap: 350000000000, created_at: now, updated_at: now },
        { id: 19, symbol: 'INTC', company_name: 'Intel Corporation', sector: 'Technology', market_cap: 160000000000, created_at: now, updated_at: now },
        { id: 20, symbol: 'AMD', company_name: 'Advanced Micro Devices, Inc.', sector: 'Technology', market_cap: 180000000000, created_at: now, updated_at: now },
        { id: 21, symbol: 'ORCL', company_name: 'Oracle Corporation', sector: 'Technology', market_cap: 300000000000, created_at: now, updated_at: now },
        { id: 22, symbol: 'IBM', company_name: 'International Business Machines', sector: 'Technology', market_cap: 150000000000, created_at: now, updated_at: now },
        { id: 23, symbol: 'ADBE', company_name: 'Adobe Inc.', sector: 'Technology', market_cap: 250000000000, created_at: now, updated_at: now },
        { id: 24, symbol: 'CRM', company_name: 'Salesforce, Inc.', sector: 'Technology', market_cap: 230000000000, created_at: now, updated_at: now },
        { id: 25, symbol: 'PYPL', company_name: 'PayPal Holdings, Inc.', sector: 'Financial Services', market_cap: 80000000000, created_at: now, updated_at: now },
        { id: 26, symbol: 'SQ', company_name: 'Block, Inc.', sector: 'Financial Services', market_cap: 50000000000, created_at: now, updated_at: now },
        { id: 27, symbol: 'SHOP', company_name: 'Shopify Inc.', sector: 'Technology', market_cap: 80000000000, created_at: now, updated_at: now },
        { id: 28, symbol: 'UBER', company_name: 'Uber Technologies, Inc.', sector: 'Technology', market_cap: 140000000000, created_at: now, updated_at: now },
        { id: 29, symbol: 'LYFT', company_name: 'Lyft, Inc.', sector: 'Technology', market_cap: 5000000000, created_at: now, updated_at: now },
        { id: 30, symbol: 'NKE', company_name: 'NIKE, Inc.', sector: 'Consumer Cyclical', market_cap: 150000000000, created_at: now, updated_at: now }
    ];
    const users = [
        { id: 1, username: 'admin', email: 'admin@stockpredict.ai', password_hash: '$2b$10$placeholderhash', role: 'admin', is_active: true, last_login: null, created_at: now }
    ];
    const system_settings = [
        { id: 1, setting_key: 'app_name', setting_value: 'StockPredict AI', description: 'Application name displayed in UI', updated_by: null, updated_at: now },
        { id: 2, setting_key: 'enable_real_time_data', setting_value: 'true', description: '', updated_by: null, updated_at: now }
    ];
    const admin_logs = [];
    const predictions = [];
    const historical_data = [];
    // Seed 90 days of synthetic historical data for all stocks
    const seedDays = 90;
    const basePrices = {
        'AAPL': 150, 'GOOGL': 120, 'MSFT': 320, 'AMZN': 140, 'TSLA': 220,
        'NVDA': 450, 'META': 300, 'NFLX': 400, 'DIS': 95, 'V': 250,
        'MA': 420, 'JPM': 180, 'BAC': 30, 'XOM': 110, 'CVX': 160,
        'KO': 60, 'PEP': 180, 'PG': 150, 'INTC': 35, 'AMD': 120,
        'ORCL': 125, 'IBM': 135, 'ADBE': 550, 'CRM': 220, 'PYPL': 70,
        'SQ': 65, 'SHOP': 65, 'UBER': 70, 'LYFT': 12, 'NKE': 95
    };
    for (const s of stocks) {
        let price = basePrices[s.symbol] || 100;
        for (let i = seedDays; i >= 1; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const vol = 1000000 + Math.floor(Math.random() * 5000000);
            const change = (Math.random() - 0.5) * (price > 200 ? 4 : 2);
            price = Math.max(5, price + change);
            const open = price + (Math.random() - 0.5) * 1.5;
            const high = Math.max(open, price) + Math.random() * 1.5;
            const low = Math.min(open, price) - Math.random() * 1.5;
            historical_data.push({
                id: nextId(),
                stock_id: s.id,
                date: date.toISOString().split('T')[0],
                open_price: Number(open.toFixed(2)),
                high_price: Number(high.toFixed(2)),
                low_price: Number(low.toFixed(2)),
                close_price: Number(price.toFixed(2)),
                volume: vol,
                adj_close: Number(price.toFixed(2)),
                created_at: date
            });
        }
    }

    // Seed sample predictions for admin dashboard visibility
    for (const s of stocks.slice(0, 10)) {
        const recent = historical_data
            .filter(h => h.stock_id === s.id)
            .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
        if (!recent) continue;
        for (let k = 3; k >= 1; k--) {
            const createdAt = new Date(now);
            createdAt.setDate(now.getDate() - (Math.floor(Math.random()*20) + k));
            const predicted = Number((recent.close_price * (1 + (Math.random()-0.5)*0.05)).toFixed(2));
            const conf = Math.round(50 + Math.random()*50);
            predictions.push({
                id: nextId(),
                stock_id: s.id,
                prediction_date: createdAt.toISOString().split('T')[0],
                predicted_price: predicted,
                confidence_score: conf,
                prediction_type: 'short_term',
                algorithm_used: 'random_forest',
                created_at: createdAt
            });
        }
    }

    const like = (a, b) => a.toLowerCase().includes(b.toLowerCase());

    return {
        async execute(query, params = []) {
            const q = query.trim();
            // Basic health check
            if (q === 'SELECT 1') return [[{ 1: 1 }]];

            // Counts
            if (q.includes('SELECT COUNT(*) as count FROM stocks')) return [[{ count: stocks.length }]];
            if (q.includes('SELECT COUNT(*) as count FROM predictions')) return [[{ count: predictions.length }]];
            if (q.includes('SELECT COUNT(*) as count FROM users')) return [[{ count: users.length }]];

            // Stock id by symbol
            if ((q.startsWith('SELECT id FROM stocks') || q.includes('SELECT id FROM stocks')) && q.includes('WHERE symbol = ?')) {
                const sym = params[0];
                const stock = stocks.find(s => s.symbol === sym);
                return [stock ? [{ id: stock.id }] : []];
            }

            // Stocks listing with optional WHERE and LIMIT/OFFSET
            if (q.startsWith('SELECT * FROM stocks')) {
                let result = [...stocks];
                if (q.includes('WHERE sector = ?')) {
                    const sector = params[0];
                    result = result.filter(s => (s.sector || null) === sector);
                }
                if (q.includes('WHERE symbol = ?')) {
                    const sym = params[0];
                    result = result.filter(s => s.symbol === sym);
                }
                // LIMIT/OFFSET not strictly needed for demo
                return [result];
            }

            // Insert stock
            if (q.startsWith('INSERT INTO stocks')) {
                const [symbol, company_name, sector] = params;
                if (stocks.find(s => s.symbol === symbol)) {
                    const err = new Error('Duplicate');
                    err.code = 'ER_DUP_ENTRY';
                    throw err;
                }
                const id = nextId();
                stocks.push({ id, symbol, company_name, sector: sector || null, market_cap: null, created_at: now, updated_at: now });
                return [{ insertId: id, affectedRows: 1 }];
            }

            if (q.startsWith('SELECT * FROM stocks WHERE id = ?')) {
                const id = params[0];
                return [[stocks.find(s => s.id === id)].filter(Boolean)];
            }

            // Historical data ascending
            if (q.startsWith('SELECT date, open_price, high_price, low_price, close_price, volume, adj_close') && q.includes('FROM historical_data') && q.includes('WHERE stock_id = ?') && q.includes('ORDER BY date ASC')) {
                const stockId = params[0];
                const data = historical_data
                    .filter(h => h.stock_id === stockId)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                return [data];
            }

            // Historical data for a stock
            if (q.startsWith('SELECT * FROM historical_data') && q.includes('WHERE stock_id = ?')) {
                const stockId = params[0];
                const data = historical_data.filter(h => h.stock_id === stockId)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                return [data.slice(0, 30)];
            }

            // Predictions for a stock
            if (q.startsWith('SELECT * FROM predictions') && q.includes('WHERE stock_id = ?')) {
                const stockId = params[0];
                const data = predictions.filter(p => p.stock_id === stockId)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                return [data.slice(0, 5)];
            }

            if (q.startsWith('INSERT INTO predictions')) {
                const [stock_id, prediction_date, predicted_price, confidence_score, prediction_type, algorithm_used] = params;
                predictions.push({ id: nextId(), stock_id, prediction_date, predicted_price, confidence_score, prediction_type, algorithm_used, created_at: new Date() });
                return [{ insertId: predictions[predictions.length - 1].id, affectedRows: 1 }];
            }

            // Predictions join by symbol
            if (q.startsWith('SELECT p.*, s.symbol, s.company_name FROM predictions p')) {
                const sym = params[0];
                const stock = stocks.find(s => s.symbol === sym);
                const data = (stock ? predictions.filter(p => p.stock_id === stock.id) : []).map(p => ({ ...p, symbol: sym, company_name: stock?.company_name }));
                return [data];
            }

            // Recent predictions across all stocks
            if (q.startsWith('SELECT p.*, s.symbol, s.company_name') && q.includes('FROM predictions p') && q.includes('JOIN stocks s')) {
                const data = predictions.map(p => {
                    const st = stocks.find(s => s.id === p.stock_id);
                    return { ...p, symbol: st?.symbol, company_name: st?.company_name };
                }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                // Handle LIMIT if present
                const m = q.match(/LIMIT\s+(\d+)/i);
                const limit = m ? parseInt(m[1]) : data.length;
                return [data.slice(0, limit)];
            }

            // Accuracy stats for last 30 days
            if (q.startsWith('SELECT') && q.includes('AVG(confidence_score)') && q.includes('FROM predictions')) {
                const cutoff = new Date(now);
                cutoff.setDate(now.getDate() - 30);
                const recentPreds = predictions.filter(p => new Date(p.created_at) >= cutoff);
                const avg = recentPreds.length ? (recentPreds.reduce((a,b)=>a + (Number(b.confidence_score)||0), 0) / recentPreds.length) : 0;
                const high = recentPreds.filter(p => Number(p.confidence_score) >= 70).length;
                return [[{ avg_confidence: avg, high_confidence_count: high, total_predictions: recentPreds.length }]];
            }

            // Admin logs join
            if (q.startsWith('SELECT al.*, u.username') && q.includes('FROM admin_logs al')) {
                const data = admin_logs.map(l => ({ ...l, username: users.find(u => u.id === l.admin_id)?.username || 'admin' }))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 20);
                return [data];
            }

            // Users admin queries
            if (q.includes('FROM users') && q.includes('WHERE username = ?') && q.includes('role = "admin"')) {
                const username = params[0];
                const role = 'admin';
                return [users.filter(u => u.username === username && u.role === role)];
            }
            // Generic user queries
            if (q.startsWith('SELECT id FROM users WHERE username = ? OR email = ?')) {
                const [username, email] = params;
                const u = users.find(u => u.username === username || u.email === email);
                return [u ? [{ id: u.id }] : []];
            }
            if (q.startsWith('SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ?')) {
                const username = params[0];
                const data = users.filter(u => u.username === username);
                return [data];
            }
            if (q.startsWith('SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = ?')) {
                const email = params[0];
                const data = users.filter(u => u.email === email);
                return [data];
            }
            if (q.startsWith('SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?')) {
                const [username, email] = params;
                const data = users.filter(u => u.username === username || u.email === email);
                return [data];
            }
            if (q.startsWith('INSERT INTO users (username, email, password_hash, role) VALUES')) {
                const [username, email, password_hash, role] = params;
                if (users.find(u => u.username === username || u.email === email)) {
                    const err = new Error('Duplicate');
                    err.code = 'ER_DUP_ENTRY';
                    throw err;
                }
                const id = nextId();
                users.push({ id, username, email, password_hash, role: role || 'user', is_active: true, last_login: null, created_at: new Date() });
                return [{ insertId: id, affectedRows: 1 }];
            }
            if (q.startsWith('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')) {
                const id = Number(params[0]);
                const user = users.find(u => u.id === id);
                if (user) user.last_login = new Date();
                return [{ affectedRows: user ? 1 : 0 }];
            }
            if (q.startsWith('SELECT id, username, email, role, is_active, last_login, created_at FROM users')) {
                return [users];
            }
            if (q.startsWith('UPDATE users SET')) {
                const id = Number(params.at(-1));
                const user = users.find(u => u.id === id);
                if (!user) return [{ affectedRows: 0 }];
                // Supports: SET is_active = ?, role = ? WHERE id = ?
                const hasIsActive = q.includes('is_active = ?');
                const hasRole = q.includes('role = ?');
                let idx = 0;
                if (hasIsActive) { user.is_active = !!params[idx]; idx += 1; }
                if (hasRole) { user.role = params[idx]; idx += 1; }
                return [{ affectedRows: 1 }];
            }

            // Admin logs
            if (q.startsWith('INSERT INTO admin_logs')) {
                const [admin_id, action, target_table, target_id, details, ip] = params;
                admin_logs.push({ id: nextId(), admin_id, action, target_table, target_id, details, ip_address: ip, created_at: new Date() });
                return [{ affectedRows: 1, insertId: admin_logs[admin_logs.length - 1].id }];
            }
            if (q.startsWith('SELECT al.*, u.username FROM admin_logs al')) {
                const data = admin_logs.map(l => ({ ...l, username: users.find(u => u.id === l.admin_id)?.username || 'admin' }))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 20);
                return [data];
            }

            // Settings
            if (q.startsWith('SELECT * FROM system_settings')) return [system_settings.sort((a,b)=>a.setting_key.localeCompare(b.setting_key))];
            if (q.startsWith('UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?')) {
                const [value, updated_by, key] = params;
                const s = system_settings.find(s => s.setting_key === key);
                if (!s) return [{ affectedRows: 0 }];
                s.setting_value = String(value);
                s.updated_by = updated_by;
                s.updated_at = new Date();
                return [{ affectedRows: 1 }];
            }

            // Delete stock
            if (q.startsWith('DELETE FROM stocks WHERE id = ?')) {
                const id = Number(params[0]);
                const idx = stocks.findIndex(s => s.id === id);
                if (idx >= 0) stocks.splice(idx, 1);
                return [{ affectedRows: idx >= 0 ? 1 : 0 }];
            }

            console.warn('DEMO DB: Unhandled query, returning empty set:', q);
            return [[]];
        }
    };
}

async function initializeDatabase() {
    try {
        if (DEMO_MODE_REQUESTED) {
            db = createDemoDb();
            return;
        }

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
        if (DEMO_MODE_REQUESTED) {
            console.log('💡 Falling back to DEMO MODE (in-memory data).');
            db = createDemoDb();
        } else {
            console.error('🛑 DEMO_MODE is disabled. Please configure MySQL credentials in backend/.env and ensure the database is running.');
            process.exit(1);
        }
    }
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
    try {
        console.log('📋 Checking and applying database schema...');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const schemaPath = path.resolve(__dirname, '../database_schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.warn('⚠️ Schema file not found at:', schemaPath);
            return;
        }

        const raw = fs.readFileSync(schemaPath, 'utf8');
        // Basic split on semicolons, ignoring blank lines and comments
        const statements = raw
            .split(/;\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const sql of statements) {
            try {
                await db.execute(sql);
            } catch (e) {
                // Ignore errors for existing objects
            }
        }
        console.log('✅ Schema ensured');
        
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
 * POST /api/auth/register
 * User registration endpoint
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Username, email and password are required' });
        }

        // Check duplicate username/email
        const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'Username or email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, 'user']
        );

        const newUser = { id: result.insertId, username, email, role: 'user' };
        const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ success: true, data: { token, user: newUser } });
    } catch (error) {
        console.error('❌ Error during user registration:', error);
        res.status(500).json({ success: false, error: 'Registration failed', details: error.message });
    }
});

/**
 * POST /api/auth/login
 * User login endpoint (username/email + password)
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if ((!username && !email) || !password) {
            return res.status(400).json({ success: false, error: 'Provide username or email and password' });
        }

        let rows;
        if (username) {
            [rows] = await db.execute('SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ?', [username]);
        } else {
            [rows] = await db.execute('SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = ?', [email]);
        }

        if (!rows || rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = rows[0];
        if (!user.is_active) {
            return res.status(401).json({ success: false, error: 'Account is deactivated' });
        }

        let valid = false;
        try {
            valid = await bcrypt.compare(password, user.password_hash);
        } catch (_) {
            valid = false;
        }
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const payload = { id: user.id, username: user.username, email: user.email, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, data: { token, user: payload } });
    } catch (error) {
        console.error('❌ Error during user login:', error);
        res.status(500).json({ success: false, error: 'Login failed', details: error.message });
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

// Google OAuth login route (only if configured)
if (isGoogleAuthConfigured) {
    app.get('/api/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    // Google OAuth callback route
    app.get('/api/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        async (req, res) => {
            try {
                // Ensure a local user exists for this Google account
                const email = req.user.email;
                const name = req.user.name;
                const username = (email?.split('@')[0] || name || 'user').toLowerCase();

                // Try fetching by email
                const [existing] = await db.execute('SELECT id, username, email, role FROM users WHERE email = ?', [email]);
                let dbUser;
                if (existing.length > 0) {
                    dbUser = existing[0];
                } else {
                    // Create user with a placeholder password hash
                    const placeholderHash = await bcrypt.hash('GOOGLE_AUTH', 10);
                    const [result] = await db.execute(
                        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                        [username, email, placeholderHash, 'user']
                    );
                    dbUser = { id: result.insertId, username, email, role: 'user' };
                }

                // Issue JWT for the user
                const token = jwt.sign({ id: dbUser.id, username: dbUser.username, email: dbUser.email, role: dbUser.role }, JWT_SECRET, { expiresIn: '24h' });
                res.redirect(`http://localhost:3000/auth/success?token=${token}`);
            } catch (error) {
                console.error('❌ Google OAuth callback error:', error);
                res.redirect('http://localhost:3000/login?error=oauth_failed');
            }
        }
    );
} else {
    app.get('/api/auth/google', (req, res) => {
        res.status(503).json({ success: false, error: 'Google OAuth not configured' });
    });
    app.get('/api/auth/google/callback', (req, res) => {
        res.status(503).json({ success: false, error: 'Google OAuth not configured' });
    });
}

// Google status endpoint for frontend to detect availability
app.get('/api/auth/google/status', (req, res) => {
    res.json({ success: true, configured: isGoogleAuthConfigured });
});

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

// Compute 1-day predictions for all stocks and return sorted by predicted gain desc
app.get('/api/stocks/predicted-gainers', async (req, res) => {
    try {
        const [stocks] = await db.execute('SELECT * FROM stocks');
        const results = [];

        for (const stock of stocks) {
            const [historicalData] = await db.execute(
                `SELECT date, open_price, high_price, low_price, close_price, volume, adj_close
                 FROM historical_data 
                 WHERE stock_id = ? 
                 ORDER BY date ASC`,
                [stock.id]
            );
            if (historicalData.length < 50) continue;

            if (!randomForest.isTrained) {
                randomForest.train(historicalData);
            }

            const predictionResult = randomForest.predict(historicalData, 1);
            if (predictionResult.success) {
                results.push({
                    ...stock,
                    predicted_price: predictionResult.predictedPrice,
                    predicted_change_percent: predictionResult.priceChangePercent,
                    predicted_confidence: predictionResult.confidence
                });
            }
        }

        const sorted = results.sort((a, b) => parseFloat(b.predicted_change_percent || 0) - parseFloat(a.predicted_change_percent || 0));
        res.json({ success: true, data: sorted });
    } catch (error) {
        console.error('❌ Error computing predicted gainers:', error);
        res.status(500).json({ success: false, error: 'Failed to compute predicted gainers', details: error.message });
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
        let [historicalData] = await db.execute(
            `SELECT date, open_price, high_price, low_price, close_price, volume, adj_close
             FROM historical_data 
             WHERE stock_id = ? 
             ORDER BY date ASC`,
            [stockId]
        );
        
        if (historicalData.length < 50) {
            // Try to backfill using Alpha Vantage (compact ~100 days)
            try {
                const records = await alphaAPI.getDailyAdjusted(symbol, 'compact');
                // Insert missing historical rows
                for (const r of records) {
                    await db.execute(
                        `INSERT IGNORE INTO historical_data 
                         (stock_id, date, open_price, high_price, low_price, close_price, volume, adj_close)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [stockId, r.date, r.open, r.high, r.low, r.close, r.volume || 0, r.adj_close || r.close]
                    );
                }
                // Re-fetch
                const [refetched] = await db.execute(
                    `SELECT date, open_price, high_price, low_price, close_price, volume, adj_close
                     FROM historical_data 
                     WHERE stock_id = ? 
                     ORDER BY date ASC`,
                    [stockId]
                );
                historicalData = refetched;
            } catch (syncErr) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient historical data and failed to backfill from Alpha Vantage',
                    details: syncErr.message
                });
            }
        }
        
        // Use Random Forest (class internally falls back to moving average if RF fails)
        if (!randomForest.isTrained || retrain) {
            console.log('🌲 Training Random Forest model...');
            const trainingResult = randomForest.train(historicalData);
            
            if (trainingResult.success === false) {
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
 * POST /api/sync/historical/:symbol
 * Backfill historical data using Alpha Vantage
 */
app.post('/api/sync/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { outputSize = 'compact' } = req.body || {};

        const [stocks] = await db.execute('SELECT id FROM stocks WHERE symbol = ?', [symbol.toUpperCase()]);
        if (stocks.length === 0) {
            return res.status(404).json({ success: false, error: 'Stock not found' });
        }
        const stockId = stocks[0].id;

        const records = await alphaAPI.getDailyAdjusted(symbol, outputSize);
        let inserted = 0;
        for (const r of records) {
            const [result] = await db.execute(
                `INSERT IGNORE INTO historical_data 
                 (stock_id, date, open_price, high_price, low_price, close_price, volume, adj_close)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [stockId, r.date, r.open, r.high, r.low, r.close, r.volume || 0, r.adj_close || r.close]
            );
            inserted += result?.affectedRows ? 1 : 0;
        }

        res.json({ success: true, data: { inserted, totalFetched: records.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to sync historical data', details: error.message });
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
 * GET /api/stocks/predicted-gainers
 * Compute 1-day predictions for all stocks and return sorted by predicted gain desc
 */
app.get('/api/stocks/predicted-gainers', async (req, res) => {
    try {
        const [stocks] = await db.execute('SELECT * FROM stocks');
        const results = [];

        for (const stock of stocks) {
            const [historicalData] = await db.execute(
                `SELECT date, open_price, high_price, low_price, close_price, volume, adj_close
                 FROM historical_data 
                 WHERE stock_id = ? 
                 ORDER BY date ASC`,
                [stock.id]
            );
            if (historicalData.length < 50) continue;

            if (!randomForest.isTrained) {
                const trainingResult = randomForest.train(historicalData);
                // Even if RF fails, class enables fallback
            }

            const predictionResult = randomForest.predict(historicalData, 1);
            if (predictionResult.success) {
                results.push({
                    ...stock,
                    predicted_price: predictionResult.predictedPrice,
                    predicted_change_percent: predictionResult.priceChangePercent,
                    predicted_confidence: predictionResult.confidence
                });
            }
        }

        const sorted = results.sort((a, b) => parseFloat(b.predicted_change_percent || 0) - parseFloat(a.predicted_change_percent || 0));
        res.json({ success: true, data: sorted });
    } catch (error) {
        console.error('❌ Error computing predicted gainers:', error);
        res.status(500).json({ success: false, error: 'Failed to compute predicted gainers', details: error.message });
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
        
        // In demo mode or missing API key, return synthetic data
        if (DEMO_MODE_ACTIVE || !process.env.NINJA_API_KEY) {
            const price = 100 + Math.random() * 50;
            const quote = {
                symbol: symbol.toUpperCase(),
                price: Number(price.toFixed(2)),
                open: Number((price + (Math.random() - 0.5)).toFixed(2)),
                high: Number((price + Math.random()).toFixed(2)),
                low: Number((price - Math.random()).toFixed(2)),
                volume: 1000000 + Math.floor(Math.random() * 500000),
                change: Number(((Math.random() - 0.5) * 2).toFixed(2)),
                changePercent: Number(((Math.random() - 0.5) * 2).toFixed(2)),
                marketCap: null,
                timestamp: new Date().toISOString()
            };
            return res.json({ success: true, data: quote });
        }

        // Fetch from Ninja API in non-demo mode
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
if (!DEMO_MODE_ACTIVE) cron.schedule('0 18 * * 1-5', async () => {
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
            console.log(`🗄️  Database: ${DEMO_MODE_ACTIVE ? 'DEMO (in-memory)' : dbConfig.database}`);
            console.log(`🌲 Random Forest: ${randomForest.isTrained ? 'Ready' : 'Needs Training'}`);
            console.log(`🔀 Sorting Algorithms: Available`);
            if (DEMO_MODE_ACTIVE) console.log('🧪 DEMO MODE: Authentication, stocks, and predictions use in-memory data.');
            console.log('\n📋 Available Endpoints:');
            console.log('   GET  /api/health           - Health check');
            console.log('   GET  /api/stocks           - Get all stocks (with sorting)');
            console.log('   GET  /api/stocks/:symbol   - Get specific stock');
            console.log('   POST /api/stocks           - Add new stock');
            console.log('   POST /api/predict/:symbol  - Generate prediction');
            console.log('   GET  /api/predictions/:symbol - Get predictions');
            console.log('   POST /api/sync/historical/:symbol - Backfill historical data (Alpha Vantage)');
            console.log('   POST /api/sort/stocks      - Sort stocks');
            console.log('   GET  /api/sort/criteria    - Get sort criteria');
            console.log('   POST /api/auth/register    - Register user');
            console.log('   POST /api/auth/login       - User login');
            console.log('   GET  /api/auth/user        - Get authenticated user');
            console.log('   GET  /api/auth/google      - Google OAuth');
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
    
    if (db && !DEMO_MODE_ACTIVE && db.end) {
        await db.end();
        console.log('📡 Database connection closed');
    }
    
    console.log('✅ Server shut down gracefully');
    process.exit(0);
});

// Start the server
startServer();
