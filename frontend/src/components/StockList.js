/**
 * StockList Component
 * 
 * This component displays a list of stocks with the following features:
 * - Real-time data fetching from backend
 * - Multiple sorting algorithms (Quick Sort, Merge Sort, Bubble Sort, Heap Sort)
 * - Responsive table design with hover effects
 * - Loading states and error handling
 * - Navigation to individual stock details
 * - Server status integration
 * 
 * The component showcases both algorithmic sorting capabilities and
 * provides a clean interface for stock data visualization.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const StockList = ({ stocks, loading, error, onFetchStocks, serverStatus }) => {
  // Component state
  const [sortBy, setSortBy] = useState('symbol_asc');
  const [algorithm, setAlgorithm] = useState('smart');
  const [localLoading, setLocalLoading] = useState(false);
  const [sortMetrics, setSortMetrics] = useState(null);

  // Fetch sort criteria on component mount
  useEffect(() => {
    fetchSortCriteria();
  }, []);

  // Initial fetch when component mounts and server is healthy
  useEffect(() => {
    if (serverStatus === 'healthy' && stocks.length === 0) {
      onFetchStocks();
    }
  }, [serverStatus, stocks.length, onFetchStocks]);

  /**
   * Fetch available sorting criteria from backend
   */
  const fetchSortCriteria = async () => {
    try {
      const response = await axios.get('/api/sort/criteria');
      if (response.data.success) {
        // Data available if needed in future; not stored to avoid unused var warning
        void response.data.data;
      }
    } catch (error) {
      console.error('Error fetching sort criteria:', error);
    }
  };

  /**
   * Handle sorting with performance tracking
   */
  const handleSort = async () => {
    if (stocks.length === 0) return;

    setLocalLoading(true);
    setSortMetrics(null);

    try {
      console.log(`🔀 Applying ${algorithm} sort with criteria: ${sortBy}`);
      
      const response = await axios.post('/api/sort/stocks', {
        sortBy,
        algorithm: algorithm === 'smart' ? 'smart' : algorithm
      });

      if (response.data.success) {
        // Update the parent component with sorted data
        // Note: In a real app, you might want to use a state management solution
        setSortMetrics(response.data.meta);
        
        // Trigger a refresh to get the sorted data
        await onFetchStocks(sortBy, algorithm);
        
        console.log(`✅ Sorting completed using ${response.data.meta.algorithm} algorithm`);
      }
    } catch (error) {
      console.error('❌ Error sorting stocks:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  /**
   * Fetch real-time data for a specific stock
   */
  const fetchRealTimeData = async (symbol) => {
    try {
      const response = await axios.post(`/api/fetch-realtime/${symbol}`);
      if (response.data.success) {
        console.log(`📈 Real-time data for ${symbol}:`, response.data.data);
        // Optionally refresh the stocks list
        await onFetchStocks(sortBy, algorithm);
      }
    } catch (error) {
      console.error(`❌ Error fetching real-time data for ${symbol}:`, error);
    }
  };

  /**
   * Run sorting algorithm benchmark
   */
  const runBenchmark = async () => {
    if (stocks.length === 0) return;

    setLocalLoading(true);
    try {
      const response = await axios.get('/api/sort/algorithms/benchmark', {
        params: { sortBy }
      });

      if (response.data.success) {
        alert(`Benchmark Results:\n${JSON.stringify(response.data.data.results, null, 2)}`);
      }
    } catch (error) {
      console.error('❌ Error running benchmark:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  /**
   * Format market cap for display
   */
  const formatMarketCap = (marketCap) => {
    if (!marketCap) return 'N/A';
    
    const billions = marketCap / 1e9;
    if (billions >= 1) {
      return `$${billions.toFixed(1)}B`;
    }
    
    const millions = marketCap / 1e6;
    return `$${millions.toFixed(0)}M`;
  };

  /**
   * Get algorithm description
   */
  const getAlgorithmDescription = (alg) => {
    const descriptions = {
      'quick': 'Quick Sort - O(n log n) average, divide & conquer',
      'merge': 'Merge Sort - O(n log n) guaranteed, stable sort',
      'bubble': 'Bubble Sort - O(n²), simple comparison sort',
      'heap': 'Heap Sort - O(n log n) guaranteed, in-place',
      'smart': 'Smart Sort - Automatically chooses best algorithm'
    };
    return descriptions[alg] || 'Unknown algorithm';
  };

  // Show loading state if server is checking or if data is loading
  if (serverStatus === 'checking' || (loading && stocks.length === 0)) {
    return (
      <div className="card text-center">
        <div className="loading-spinner"></div>
        <p className="mt-md">Loading stock data...</p>
      </div>
    );
  }

  // Show error state if server is offline
  if (serverStatus === 'offline') {
    return (
      <div className="card text-center">
        <h2 className="text-danger">🚫 Server Offline</h2>
        <p className="text-secondary mt-md">
          Cannot connect to the backend server. Please make sure it's running on port 8081.
        </p>
        <button 
          className="btn btn-primary mt-lg"
          onClick={() => window.location.reload()}
        >
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div className="card">
        <div className="error-message">
          <h3>❌ Error Loading Stocks</h3>
          <p>{error}</p>
          <button 
            className="btn btn-primary mt-md"
            onClick={() => onFetchStocks()}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="card mb-xl">
        <div className="card-header">
          <div>
            <h1 className="card-title">📊 Stock Market Dashboard</h1>
            <p className="card-subtitle">
              Powered by Random Forest ML predictions and advanced sorting algorithms
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-secondary">
              Total Stocks: <span className="text-primary font-weight-bold">{stocks.length}</span>
            </div>
            {sortMetrics && (
              <div className="text-sm text-success mt-sm">
                Sorted by {sortMetrics.algorithm} in {sortMetrics.executionTime}ms
              </div>
            )}
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
          {/* Sort Criteria */}
          <div className="form-group">
            <label className="form-label">📏 Sort By</label>
            <select 
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <optgroup label="Alphabetical">
                <option value="symbol_asc">Symbol (A-Z)</option>
                <option value="symbol_desc">Symbol (Z-A)</option>
                <option value="name_asc">Company Name (A-Z)</option>
                <option value="name_desc">Company Name (Z-A)</option>
              </optgroup>
              <optgroup label="Market Data">
                <option value="market_cap_desc">Market Cap (High-Low)</option>
                <option value="market_cap_asc">Market Cap (Low-High)</option>
              </optgroup>
              <optgroup label="Sector">
                <option value="sector_asc">Sector (A-Z)</option>
                <option value="sector_desc">Sector (Z-A)</option>
              </optgroup>
              <optgroup label="Date">
                <option value="date_desc">Recently Added</option>
                <option value="date_asc">Oldest First</option>
              </optgroup>
            </select>
          </div>

          {/* Algorithm Selection */}
          <div className="form-group">
            <label className="form-label">🔀 Algorithm</label>
            <select 
              className="form-select"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              title={getAlgorithmDescription(algorithm)}
            >
              <option value="smart">🧠 Smart (Auto)</option>
              <option value="quick">⚡ Quick Sort</option>
              <option value="merge">🔄 Merge Sort</option>
              <option value="heap">🏗️ Heap Sort</option>
              {stocks.length <= 20 && (
                <option value="bubble">🫧 Bubble Sort</option>
              )}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button 
              className="btn btn-primary w-full"
              onClick={handleSort}
              disabled={localLoading || loading || stocks.length === 0}
            >
              {localLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Sorting...
                </>
              ) : (
                <>🔀 Apply Sort</>
              )}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button 
              className="btn btn-secondary w-full"
              onClick={runBenchmark}
              disabled={localLoading || loading || stocks.length === 0}
            >
              📊 Benchmark
            </button>
          </div>
        </div>

        {/* Algorithm Description */}
        <div className="p-md bg-tertiary rounded mb-lg">
          <p className="text-sm text-secondary">
            <strong>Current Algorithm:</strong> {getAlgorithmDescription(algorithm)}
          </p>
        </div>
      </div>

      {/* Stocks Table */}
      {stocks.length === 0 ? (
        <div className="card text-center">
          <h3 className="text-muted">📈 No Stocks Available</h3>
          <p className="text-secondary mt-md">
            Add some stocks to get started with predictions and analysis.
          </p>
          <Link to="/add-stock" className="btn btn-primary mt-lg">
            ➕ Add Your First Stock
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>📈 Symbol</th>
                  <th>🏢 Company</th>
                  <th>🏭 Sector</th>
                  <th>💰 Market Cap</th>
                  <th>📅 Added</th>
                  <th>🔗 Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, index) => (
                  <tr key={stock.id || index} className="fade-in">
                    <td>
                      <Link 
                        to={`/stock/${stock.symbol}`}
                        className="text-primary font-weight-bold text-decoration-none"
                      >
                        {stock.symbol}
                      </Link>
                    </td>
                    <td className="text-primary">{stock.company_name}</td>
                    <td>
                      <span className="badge bg-secondary">
                        {stock.sector || 'Unknown'}
                      </span>
                    </td>
                    <td className="text-success">
                      {formatMarketCap(stock.market_cap)}
                    </td>
                    <td className="text-muted">
                      {stock.created_at ? 
                        new Date(stock.created_at).toLocaleDateString() : 
                        'N/A'
                      }
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <Link 
                          to={`/stock/${stock.symbol}`}
                          className="btn btn-sm btn-primary"
                          title="View Details & Predictions"
                        >
                          📊 Details
                        </Link>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => fetchRealTimeData(stock.symbol)}
                          title="Fetch Real-time Data"
                        >
                          🌐 Live Data
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Metrics */}
          {sortMetrics && (
            <div className="mt-lg p-md bg-tertiary rounded">
              <h4 className="text-sm font-weight-bold mb-sm">⚡ Performance Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-sm">
                <div>
                  <span className="text-secondary">Algorithm:</span>
                  <span className="text-primary ml-sm">{sortMetrics.algorithm}</span>
                </div>
                <div>
                  <span className="text-secondary">Execution Time:</span>
                  <span className="text-success ml-sm">{sortMetrics.executionTime}ms</span>
                </div>
                <div>
                  <span className="text-secondary">Items Sorted:</span>
                  <span className="text-primary ml-sm">{sortMetrics.itemCount}</span>
                </div>
                <div>
                  <span className="text-secondary">Criteria:</span>
                  <span className="text-primary ml-sm">{sortMetrics.sortCriteria}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-xl">
        <Link to="/add-stock" className="card text-center hover:scale-105">
          <h3 className="text-primary">➕ Add New Stock</h3>
          <p className="text-secondary mt-sm">
            Add a new stock to track and predict
          </p>
        </Link>

        <Link to="/predictions" className="card text-center hover:scale-105">
          <h3 className="text-primary">🔮 View Predictions</h3>
          <p className="text-secondary mt-sm">
            See Random Forest predictions for all stocks
          </p>
        </Link>

        <Link to="/sorting-demo" className="card text-center hover:scale-105">
          <h3 className="text-primary">🔀 Algorithm Demo</h3>
          <p className="text-secondary mt-sm">
            Interactive demonstration of sorting algorithms
          </p>
        </Link>
      </div>
    </div>
  );
};

export default StockList;