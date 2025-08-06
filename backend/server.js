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
import yahooFinance from 'yahoo-finance2';
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

// CORS configuration for frontend integration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize algorithm instances
const randomForest = new StockRandomForest({
    nEstimators: 100,
    maxDepth: 10,
    minSamplesLeaf: 1
});

const stockSorter = new StockSorter();

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
 * Fetch real-time data from Yahoo Finance
 */
app.post('/api/fetch-realtime/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        console.log(`🌐 Fetching real-time data for ${symbol}...`);
        
        // Fetch from Yahoo Finance
        const quote = await yahooFinance.quote(symbol);
        
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
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                volume: quote.regularMarketVolume,
                marketCap: quote.marketCap,
                dayHigh: quote.regularMarketDayHigh,
                dayLow: quote.regularMarketDayLow,
                timestamp: new Date().toISOString()
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
                // Fetch latest data
                const quote = await yahooFinance.quote(stock.symbol);
                
                if (quote && quote.regularMarketPrice) {
                    // Add to historical data
                    await db.execute(
                        `INSERT IGNORE INTO historical_data 
                         (stock_id, date, open_price, high_price, low_price, close_price, volume, adj_close)
                         SELECT id, CURDATE(), ?, ?, ?, ?, ?, ?
                         FROM stocks WHERE symbol = ?`,
                        [
                            quote.regularMarketPreviousClose || quote.regularMarketPrice,
                            quote.regularMarketDayHigh || quote.regularMarketPrice,
                            quote.regularMarketDayLow || quote.regularMarketPrice,
                            quote.regularMarketPrice,
                            quote.regularMarketVolume || 0,
                            quote.regularMarketPrice,
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
