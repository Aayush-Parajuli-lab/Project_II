import axios from 'axios';
import axiosRetry from 'axios-retry';
import dotenv from 'dotenv';

dotenv.config();

// Configure axios with retry logic
axiosRetry(axios, { 
    retries: 3, 
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               error.response?.status === 429;
    }
});

class NinjaStockAPI {
    constructor() {
        this.baseURL = 'https://api.api-ninjas.com/v1';
        this.apiKey = process.env.NINJA_API_KEY || ''; // Leave blank as requested
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get stock quote data for a symbol
     */
    async getStockQuote(symbol) {
        try {
            const response = await this.axiosInstance.get(`/stockprice`, {
                params: { ticker: symbol.toUpperCase() }
            });

            if (response.data && response.data.price) {
                return {
                    symbol: symbol.toUpperCase(),
                    price: response.data.price,
                    open: response.data.open || null,
                    high: response.data.high || null,
                    low: response.data.low || null,
                    volume: response.data.volume || null,
                    change: response.data.change || null,
                    changePercent: response.data.change_percent || null,
                    marketCap: response.data.market_cap || null,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error(`No data found for symbol ${symbol}`);
            }
        } catch (error) {
            console.error(`Error fetching stock data for ${symbol}:`, error.message);
            
            if (error.response?.status === 401) {
                throw new Error('Invalid API key for Ninja API');
            } else if (error.response?.status === 429) {
                throw new Error('API rate limit exceeded');
            } else if (error.response?.status === 404) {
                throw new Error(`Stock symbol ${symbol} not found`);
            }
            
            throw new Error(`Failed to fetch stock data: ${error.message}`);
        }
    }

    /**
     * Get multiple stock quotes
     */
    async getMultipleStockQuotes(symbols) {
        const results = [];
        const errors = [];

        // Process symbols in batches to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const promises = batch.map(async (symbol) => {
                try {
                    const data = await this.getStockQuote(symbol);
                    return { symbol, data, success: true };
                } catch (error) {
                    errors.push({ symbol, error: error.message });
                    return { symbol, error: error.message, success: false };
                }
            });

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);

            // Add delay between batches to respect rate limits
            if (i + batchSize < symbols.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            results: results.filter(r => r.success).map(r => r.data),
            errors: errors,
            total: symbols.length,
            successful: results.filter(r => r.success).length,
            failed: errors.length
        };
    }

    /**
     * Get historical stock data (if available through Ninja API)
     */
    async getHistoricalData(symbol, period = '1mo') {
        try {
            // Note: This endpoint might not be available in Ninja API
            // You may need to use a different service for historical data
            console.warn('Historical data not available through Ninja API. Consider using alternative service.');
            return [];
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            await this.getStockQuote('AAPL');
            return { success: true, message: 'Ninja API connection successful' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

export default NinjaStockAPI;