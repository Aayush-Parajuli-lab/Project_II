/**
 * Random Forest Algorithm for Stock Price Prediction
 * 
 * This module implements a Random Forest regression model to predict stock prices
 * based on historical data and technical indicators.
 * 
 * Features used for prediction:
 * - Moving averages (5, 10, 20 days)
 * - RSI (Relative Strength Index)
 * - Price volatility
 * - Volume trends
 * - Price momentum
 */

import { RandomForestRegression } from 'ml-random-forest';
import { Matrix } from 'ml-matrix';

export class StockRandomForest {
    constructor(options = {}) {
        // Random Forest configuration
        this.nEstimators = options.nEstimators || 100;
        this.maxDepth = options.maxDepth || 10;
        this.minSamplesLeaf = options.minSamplesLeaf || 1;
        this.maxFeatures = options.maxFeatures || 'sqrt';
        
        this.model = null;
        this.isTrained = false;
        this.featureNames = [
            'sma_5', 'sma_10', 'sma_20',     // Simple Moving Averages
            'ema_12', 'ema_26',              // Exponential Moving Averages
            'rsi',                           // Relative Strength Index
            'volatility',                    // Price volatility
            'volume_ratio',                  // Volume ratio
            'momentum_3', 'momentum_7',      // Price momentum
            'price_change_pct'               // Price change percentage
        ];
    }

    /**
     * Calculate technical indicators from historical price data
     * @param {Array} historicalData - Array of historical stock data
     * @returns {Array} Array of feature vectors
     */
    calculateTechnicalIndicators(historicalData) {
        const features = [];
        
        for (let i = 26; i < historicalData.length; i++) { // Start from index 26 to have enough data for all indicators
            const current = historicalData[i];
            const slice = historicalData.slice(0, i + 1);
            
            // Simple Moving Averages
            const sma5 = this.calculateSMA(slice, 5);
            const sma10 = this.calculateSMA(slice, 10);
            const sma20 = this.calculateSMA(slice, 20);
            
            // Exponential Moving Averages
            const ema12 = this.calculateEMA(slice, 12);
            const ema26 = this.calculateEMA(slice, 26);
            
            // RSI (Relative Strength Index)
            const rsi = this.calculateRSI(slice, 14);
            
            // Volatility (standard deviation of last 10 prices)
            const volatility = this.calculateVolatility(slice, 10);
            
            // Volume ratio (current volume / average volume of last 10 days)
            const volumeRatio = this.calculateVolumeRatio(slice, 10);
            
            // Momentum
            const momentum3 = this.calculateMomentum(slice, 3);
            const momentum7 = this.calculateMomentum(slice, 7);
            
            // Price change percentage
            const priceChangePct = slice.length > 1 ? 
                ((current.close_price - slice[slice.length - 2].close_price) / slice[slice.length - 2].close_price) * 100 : 0;
            
            features.push([
                sma5, sma10, sma20,
                ema12, ema26,
                rsi,
                volatility,
                volumeRatio,
                momentum3, momentum7,
                priceChangePct
            ]);
        }
        
        return features;
    }

    /**
     * Calculate Simple Moving Average
     */
    calculateSMA(data, period) {
        if (data.length < period) return data[data.length - 1].close_price;
        
        const slice = data.slice(-period);
        const sum = slice.reduce((acc, item) => acc + parseFloat(item.close_price), 0);
        return sum / period;
    }

    /**
     * Calculate Exponential Moving Average
     */
    calculateEMA(data, period) {
        if (data.length < period) return data[data.length - 1].close_price;
        
        const multiplier = 2 / (period + 1);
        let ema = parseFloat(data[0].close_price);
        
        for (let i = 1; i < data.length; i++) {
            ema = (parseFloat(data[i].close_price) * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    /**
     * Calculate RSI (Relative Strength Index)
     */
    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return 50; // Return neutral RSI
        
        let gains = 0;
        let losses = 0;
        
        // Calculate initial average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = parseFloat(data[i].close_price) - parseFloat(data[i - 1].close_price);
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        // Calculate RSI for remaining data
        for (let i = period + 1; i < data.length; i++) {
            const change = parseFloat(data[i].close_price) - parseFloat(data[i - 1].close_price);
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;
            
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        }
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate price volatility (standard deviation)
     */
    calculateVolatility(data, period) {
        if (data.length < period) return 0;
        
        const prices = data.slice(-period).map(item => parseFloat(item.close_price));
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Calculate volume ratio
     */
    calculateVolumeRatio(data, period) {
        if (data.length < period) return 1;
        
        const currentVolume = parseFloat(data[data.length - 1].volume);
        const avgVolume = data.slice(-period).reduce((sum, item) => sum + parseFloat(item.volume), 0) / period;
        
        return avgVolume > 0 ? currentVolume / avgVolume : 1;
    }

    /**
     * Calculate momentum
     */
    calculateMomentum(data, period) {
        if (data.length < period + 1) return 0;
        
        const currentPrice = parseFloat(data[data.length - 1].close_price);
        const pastPrice = parseFloat(data[data.length - 1 - period].close_price);
        
        return ((currentPrice - pastPrice) / pastPrice) * 100;
    }

    /**
     * Train the Random Forest model
     * @param {Array} historicalData - Historical stock data
     * @returns {Object} Training results
     */
    train(historicalData) {
        try {
            console.log('🌲 Starting Random Forest training...');
            
            // Calculate features
            const features = this.calculateTechnicalIndicators(historicalData);
            
            // Prepare target values (next day's closing price)
            const targets = [];
            for (let i = 27; i < historicalData.length; i++) { // i + 1 for next day's price
                targets.push(parseFloat(historicalData[i].close_price));
            }

            // Ensure we have enough data
            if (features.length < 30) {
                throw new Error('Insufficient data for training. Need at least 30 data points.');
            }

            console.log(`📊 Training data: ${features.length} samples, ${features[0].length} features`);

            // Create and train the model
            const X = new Matrix(features);
            const y = targets;

            this.model = new RandomForestRegression({
                nEstimators: this.nEstimators,
                maxDepth: this.maxDepth,
                minSamplesLeaf: this.minSamplesLeaf,
                maxFeatures: this.maxFeatures,
                replacement: true,
                seed: 42
            });

            this.model.train(X, y);
            this.isTrained = true;

            console.log('✅ Random Forest model trained successfully');

            return {
                success: true,
                samplesUsed: features.length,
                featuresCount: features[0].length,
                modelParams: {
                    nEstimators: this.nEstimators,
                    maxDepth: this.maxDepth,
                    minSamplesLeaf: this.minSamplesLeaf
                }
            };

        } catch (error) {
            console.error('❌ Error training Random Forest model:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Make prediction for future stock price
     * @param {Array} recentData - Recent historical data for prediction
     * @param {number} daysAhead - Number of days to predict ahead (default: 1)
     * @returns {Object} Prediction results
     */
    predict(recentData, daysAhead = 1) {
        try {
            if (!this.isTrained || !this.model) {
                throw new Error('Model not trained. Please train the model first.');
            }

            console.log('🔮 Making prediction with Random Forest...');

            // Calculate features for the most recent data
            const features = this.calculateTechnicalIndicators(recentData);
            
            if (features.length === 0) {
                throw new Error('Insufficient recent data for prediction');
            }

            // Get the latest feature vector
            const latestFeatures = features[features.length - 1];
            const X = new Matrix([latestFeatures]);

            // Make prediction
            const prediction = this.model.predict(X);
            const predictedPrice = prediction[0];

            // Calculate confidence score (simplified approach)
            const recentPrices = recentData.slice(-10).map(d => parseFloat(d.close_price));
            const currentPrice = parseFloat(recentData[recentData.length - 1].close_price);
            const priceVolatility = this.calculateVolatility(recentData, 10);
            
            // Confidence based on prediction vs current price and volatility
            const priceDiff = Math.abs(predictedPrice - currentPrice);
            const confidenceScore = Math.max(0, Math.min(100, 100 - (priceDiff / currentPrice * 100) - (priceVolatility / currentPrice * 50)));

            console.log(`💡 Prediction: $${predictedPrice.toFixed(2)}, Confidence: ${confidenceScore.toFixed(1)}%`);

            return {
                success: true,
                predictedPrice: parseFloat(predictedPrice.toFixed(2)),
                confidence: parseFloat(confidenceScore.toFixed(2)),
                currentPrice: currentPrice,
                priceChange: parseFloat((predictedPrice - currentPrice).toFixed(2)),
                priceChangePercent: parseFloat(((predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)),
                daysAhead: daysAhead,
                algorithm: 'Random Forest',
                features: this.featureNames,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error making prediction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get model information
     */
    getModelInfo() {
        return {
            algorithm: 'Random Forest Regression',
            isTrained: this.isTrained,
            parameters: {
                nEstimators: this.nEstimators,
                maxDepth: this.maxDepth,
                minSamplesLeaf: this.minSamplesLeaf,
                maxFeatures: this.maxFeatures
            },
            features: this.featureNames
        };
    }
}