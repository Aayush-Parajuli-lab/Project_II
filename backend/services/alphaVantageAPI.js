import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class AlphaVantageAPI {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    this.baseURL = 'https://www.alphavantage.co';
    this.http = axios.create({ baseURL: this.baseURL, timeout: 30000 });
  }

  async getDailyAdjusted(symbol, outputSize = 'compact') {
    if (!this.apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY not set');
    }

    const params = {
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: symbol.toUpperCase(),
      outputsize: outputSize, // 'compact' (100 days) or 'full'
      apikey: this.apiKey
    };

    const url = '/query';
    const response = await this.http.get(url, { params });

    if (response.data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${response.data['Error Message']}`);
    }
    if (response.data['Note']) {
      throw new Error(`Alpha Vantage note: ${response.data['Note']}`);
    }

    const series = response.data['Time Series (Daily)'];
    if (!series) {
      throw new Error('Unexpected Alpha Vantage response (no Time Series)');
    }

    const records = Object.entries(series).map(([date, ohlc]) => ({
      date,
      open: parseFloat(ohlc['1. open']),
      high: parseFloat(ohlc['2. high']),
      low: parseFloat(ohlc['3. low']),
      close: parseFloat(ohlc['4. close']),
      adj_close: parseFloat(ohlc['5. adjusted close']),
      volume: parseInt(ohlc['6. volume'], 10)
    }));

    // Sort ascending by date (oldest first)
    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    return records;
  }
}

export default AlphaVantageAPI;