/**
 * StockDetail Component - Placeholder
 * 
 * This component will display detailed information about a specific stock
 * including historical data, predictions, and charts.
 * 
 * TODO: Implement full functionality with:
 * - Stock price charts using Chart.js
 * - Historical data display
 * - Random Forest predictions
 * - Technical indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const StockDetail = () => {
  const { symbol } = useParams();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lastPrediction, setLastPrediction] = useState(null);

  const fetchStockDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/stocks/${symbol}`);
      
      if (response.data.success) {
        setStockData(response.data.data);
      } else {
        setError('Stock not found');
      }
    } catch (error) {
      console.error('Error fetching stock detail:', error);
      setError('Failed to fetch stock details');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      fetchStockDetail();
    }
  }, [symbol, fetchStockDetail]);

  const generatePrediction = async () => {
    setActionError('');
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/predict/compose/${symbol}`, { days_ahead: 1, retrain: false });
      if (response.data.success) {
        const p = response.data.data.prediction;
        const current = response.data.data.currentPrice;
        setLastPrediction({
          predictedPrice: p.predictedPrice,
          confidence: Math.round(p.confidence),
          currentPrice: current,
          generatedAt: new Date().toISOString()
        });
        // Refresh detail to reflect new prediction history
        await fetchStockDetail();
      } else {
        setActionError(response.data.error || 'Prediction failed');
      }
    } catch (err) {
      console.error('Error generating prediction:', err);
      setActionError(err.response?.data?.details || err.response?.data?.error || 'Failed to generate prediction.');
    } finally {
      setActionLoading(false);
    }
  };

  const syncHistorical = async (size = 'compact') => {
    setActionError('');
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/sync/historical/${symbol}`, { outputSize: size });
      if (res.data.success) {
        await fetchStockDetail();
      } else {
        setActionError(res.data.error || 'Sync failed');
      }
    } catch (err) {
      setActionError(err.response?.data?.details || err.response?.data?.error || 'Failed to sync historical data');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center">
        <div className="loading-spinner"></div>
        <p className="mt-md">Loading stock details for {symbol}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center">
        <h2 className="text-danger">❌ {error}</h2>
        <Link to="/" className="btn btn-primary mt-lg">
          🏠 Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="card mb-xl">
        <div className="card-header">
          <div>
            <h1 className="card-title">📈 {stockData?.stock?.symbol}</h1>
            <p className="card-subtitle">{stockData?.stock?.company_name}</p>
          </div>
          <div className="flex gap-md">
            <button 
              onClick={generatePrediction}
              className="btn btn-primary"
              disabled={actionLoading}
            >
              🔮 Generate Prediction
            </button>
            <Link to="/" className="btn btn-secondary">
              🏠 Back to Dashboard
            </Link>
          </div>
        </div>
        {actionError && (
          <div className="p-md text-danger">{actionError}</div>
        )}
        {lastPrediction && (
          <div className="p-md">
            <div className="card" style={{ borderLeft: '6px solid #4CAF50' }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-secondary text-sm">Predicted Price</div>
                  <div className="text-3xl text-primary font-weight-bold">${lastPrediction.predictedPrice}</div>
                </div>
                <div className="text-right">
                  <div className="text-secondary text-sm">Confidence</div>
                  <div className="text-2xl text-success font-weight-bold">{lastPrediction.confidence}%</div>
                </div>
              </div>
              <div className="flex justify-between mt-sm text-sm text-secondary">
                <div>Current: {lastPrediction.currentPrice != null ? `$${lastPrediction.currentPrice}` : 'N/A'}</div>
                <div>Generated: {new Date(lastPrediction.generatedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stock Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <div className="card">
          <h3 className="card-title">📊 Stock Information</h3>
          <div className="space-y-md">
            <div className="flex justify-between">
              <span className="text-secondary">Symbol:</span>
              <span className="text-primary font-weight-bold">{stockData?.stock?.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Company:</span>
              <span className="text-primary">{stockData?.stock?.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Sector:</span>
              <span className="text-primary">{stockData?.stock?.sector || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Historical Data Points:</span>
              <span className="text-success">{stockData?.historicalData?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Predictions:</span>
              <span className="text-success">{stockData?.predictions?.length || 0}</span>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => syncHistorical('compact')} className="btn btn-outline btn-sm" disabled={actionLoading}>↻ Sync (100 days)</button>
              <button onClick={() => syncHistorical('full')} className="btn btn-outline btn-sm" disabled={actionLoading}>↻ Sync (Full)</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">📉 Price History (Last 30)</h3>
          {stockData?.historicalData?.length ? (
            <Line
              data={{
                labels: stockData.historicalData.map(h => h.date),
                datasets: [
                  {
                    label: 'Close',
                    data: stockData.historicalData.map(h => h.close_price),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    tension: 0.25,
                    pointRadius: 0
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: true } },
                scales: { x: { display: false } }
              }}
            />
          ) : (
            <p className="text-secondary">No historical data available.</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">🔮 Recent Predictions</h3>
          {stockData?.predictions?.length > 0 ? (
            <div className="space-y-md">
              {stockData.predictions.slice(0, 3).map((prediction, index) => (
                <div key={index} className="p-md bg-tertiary rounded">
                  <div className="flex justify-between">
                    <span className="text-secondary">Predicted Price:</span>
                    <span className="text-success">${prediction.predicted_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Confidence:</span>
                    <span className="text-primary">{prediction.confidence_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Date:</span>
                    <span className="text-muted">{new Date(prediction.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted">
              <p>No predictions available</p>
              <button 
                onClick={generatePrediction}
                className="btn btn-primary mt-md"
                disabled={actionLoading}
              >
                🔮 Generate First Prediction
              </button>
              <div className="mt-sm">
                <button onClick={() => syncHistorical('compact')} className="btn btn-outline btn-sm" disabled={actionLoading}>↻ Sync History</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="card mt-xl text-center">
        <h3 className="text-primary">🚧 Coming Soon</h3>
        <p className="text-secondary mt-md">
          This component will include interactive charts, detailed historical analysis, 
          and advanced prediction visualizations.
        </p>
      </div>
    </div>
  );
};

export default StockDetail;