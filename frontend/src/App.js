/**
 * Stock Prediction App - Main React Component
 * 
 * This is the main application component that provides:
 * - Navigation and routing between different views
 * - Global state management
 * - Responsive layout with modern CSS design
 * - Integration with backend API endpoints
 * 
 * Features:
 * - Stock listing with sorting capabilities
 * - Individual stock analysis and predictions
 * - Real-time data fetching
 * - Interactive charts and visualizations
 * 
 * Author: Stock Prediction App
 * Version: 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import PredictionDashboard from './components/PredictionDashboard';
import AddStock from './components/AddStock';
import SortingDemo from './components/SortingDemo';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8081';
axios.defaults.timeout = 10000;

function App() {
  // Global state for the application
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  /**
   * Check if backend server is running and healthy
   */
  const checkServerHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      if (response.data.success) {
        setServerStatus('healthy');
        console.log('✅ Backend server is healthy');
      } else {
        setServerStatus('unhealthy');
      }
    } catch (error) {
      console.error('❌ Backend server health check failed:', error);
      setServerStatus('offline');
    }
  };

  /**
   * Fetch stocks from the backend with optional sorting
   */
  const fetchStocks = async (sortBy = 'symbol_asc', algorithm = 'smart') => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📊 Fetching stocks sorted by ${sortBy} using ${algorithm} algorithm`);
      
      const response = await axios.get('/api/stocks', {
        params: {
          sortBy,
          algorithm,
          limit: 100
        }
      });

      if (response.data.success) {
        setStocks(response.data.data);
        console.log(`✅ Fetched ${response.data.data.length} stocks`);
      } else {
        throw new Error(response.data.error || 'Failed to fetch stocks');
      }
    } catch (error) {
      console.error('❌ Error fetching stocks:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a new stock to the database
   */
  const addStock = async (stockData) => {
    try {
      const response = await axios.post('/api/stocks', stockData);
      
      if (response.data.success) {
        console.log('✅ Stock added successfully');
        // Refresh the stocks list
        await fetchStocks();
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('❌ Error adding stock:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to add stock' 
      };
    }
  };

  return (
    <div className="App">
      <Router>
        <div className="app-container">
          {/* Header/Navigation */}
          <Header serverStatus={serverStatus} onRefreshHealth={checkServerHealth} />
          
          {/* Main Content */}
          <main className="main-content">
            <Routes>
              {/* Home/Stock List Route */}
              <Route 
                path="/" 
                element={
                  <StockList 
                    stocks={stocks}
                    loading={loading}
                    error={error}
                    onFetchStocks={fetchStocks}
                    serverStatus={serverStatus}
                  />
                } 
              />
              
              {/* Individual Stock Detail Route */}
              <Route 
                path="/stock/:symbol" 
                element={<StockDetail />} 
              />
              
              {/* Prediction Dashboard Route */}
              <Route 
                path="/predictions" 
                element={<PredictionDashboard />} 
              />
              
              {/* Add New Stock Route */}
              <Route 
                path="/add-stock" 
                element={<AddStock onAddStock={addStock} />} 
              />
              
              {/* Sorting Algorithms Demo Route */}
              <Route 
                path="/sorting-demo" 
                element={<SortingDemo stocks={stocks} />} 
              />
            </Routes>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </div>
  );
}

/**
 * Header Component with Navigation
 */
function Header({ serverStatus, onRefreshHealth }) {
  const location = useLocation();

  const getServerStatusColor = () => {
    switch (serverStatus) {
      case 'healthy': return '#4CAF50';
      case 'unhealthy': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#2196F3';
    }
  };

  const getServerStatusText = () => {
    switch (serverStatus) {
      case 'healthy': return 'Server Online';
      case 'unhealthy': return 'Server Issues';
      case 'offline': return 'Server Offline';
      default: return 'Checking...';
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Logo/Title */}
        <div className="logo-section">
          <Link to="/" className="logo-link">
            <h1 className="app-title">📈 StockPredict AI</h1>
            <p className="app-subtitle">Random Forest Prediction Engine</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="main-navigation">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            🏠 Dashboard
          </Link>
          <Link 
            to="/predictions" 
            className={`nav-link ${location.pathname === '/predictions' ? 'active' : ''}`}
          >
            🔮 Predictions
          </Link>
          <Link 
            to="/add-stock" 
            className={`nav-link ${location.pathname === '/add-stock' ? 'active' : ''}`}
          >
            ➕ Add Stock
          </Link>
          <Link 
            to="/sorting-demo" 
            className={`nav-link ${location.pathname === '/sorting-demo' ? 'active' : ''}`}
          >
            🔀 Sorting Demo
          </Link>
        </nav>

        {/* Server Status */}
        <div className="server-status">
          <div 
            className="status-indicator"
            style={{ backgroundColor: getServerStatusColor() }}
            onClick={onRefreshHealth}
            title="Click to refresh server status"
          >
            <span className="status-text">{getServerStatusText()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Footer Component
 */
function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>🌲 Algorithms</h4>
          <p>Random Forest Regression</p>
          <p>Quick Sort • Merge Sort • Heap Sort</p>
        </div>
        
        <div className="footer-section">
          <h4>📊 Data Sources</h4>
          <p>Yahoo Finance API</p>
          <p>Real-time Market Data</p>
        </div>
        
        <div className="footer-section">
          <h4>🛠️ Tech Stack</h4>
          <p>React • Node.js • MySQL</p>
          <p>Machine Learning • REST API</p>
        </div>
        
        <div className="footer-section">
          <h4>ℹ️ About</h4>
          <p>Stock Prediction App v1.0</p>
          <p>Built with ❤️ for learning</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2024 StockPredict AI • Educational Project • Not Financial Advice</p>
      </div>
    </footer>
  );
}

export default App;
