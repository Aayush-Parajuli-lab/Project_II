/**
 * StockVision Pro - Information Sharing Platform
 * 
 * This is the main application component that provides:
 * - Navigation and routing between different views
 * - Global state management
 * - Responsive layout with modern CSS design
 * - Integration with backend API endpoints
 * 
 * Features:
 * - Stock listing with sorting capabilities (PUBLIC)
 * - Individual stock analysis and predictions (PUBLIC)
 * - Real-time data fetching (PUBLIC)
 * - Interactive charts and visualizations (PUBLIC)
 * - Admin panel for system management (requires login)
 * 
 * Author: Stock Prediction App
 * Version: 2.0.0 - Information Sharing Platform
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import PredictionDashboard from './components/PredictionDashboard';
import AddStock from './components/AddStock';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminSettings from './components/admin/AdminSettings';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8081';
axios.defaults.timeout = 10000;

function App() {
  // Global state for the application
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [adminAuth, setAdminAuth] = useState({
    isAuthenticated: false,
    token: localStorage.getItem('adminToken'),
    user: null
  });

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
    checkAdminAuth();
  }, []);

  /**
   * Check admin authentication status
   */
  const checkAdminAuth = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const response = await axios.get('/api/admin/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAdminAuth({
          isAuthenticated: true,
          token,
          user: response.data.data.user
        });
      }
    } catch (error) {
      localStorage.removeItem('adminToken');
      setAdminAuth({
        isAuthenticated: false,
        token: null,
        user: null
      });
    }
  };

  /**
   * Check server health
   */
  const checkServerHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      if (response.data.success) {
        setServerStatus('online');
      } else {
        setServerStatus('error');
      }
    } catch (error) {
      setServerStatus('offline');
      setError('Server is offline. Please check if the backend is running.');
    }
  };

  /**
   * Handle admin login
   */
  const handleAdminLogin = (token, user) => {
    localStorage.setItem('adminToken', token);
    setAdminAuth({
      isAuthenticated: true,
      token,
      user
    });
  };

  /**
   * Handle admin logout
   */
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminAuth({
      isAuthenticated: false,
      token: null,
      user: null
    });
  };

  /**
   * Fetch stocks from API
   */
  const fetchStocks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/stocks');
      if (response.data.success) {
        setStocks(response.data.data);
      } else {
        setError('Failed to fetch stocks');
      }
    } catch (error) {
      setError('Error fetching stocks: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch stocks on component mount
  useEffect(() => {
    if (serverStatus === 'online') {
      fetchStocks();
    }
  }, [serverStatus]);

  const location = useLocation();

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title">StockVision Pro</h1>
            <p className="app-subtitle">Information Sharing Platform</p>
          </div>
          
          <nav className="main-nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              📊 Stocks
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
            {adminAuth.isAuthenticated ? (
              <Link 
                to="/admin/dashboard" 
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                ⚙️ Admin
              </Link>
            ) : (
              <Link 
                to="/admin/login" 
                className={`nav-link ${location.pathname === '/admin/login' ? 'active' : ''}`}
              >
                🔐 Admin Login
              </Link>
            )}
          </nav>

          <div className="header-status">
            <div className={`status-indicator ${serverStatus}`}>
              {serverStatus === 'online' ? '🟢 Online' : 
               serverStatus === 'offline' ? '🔴 Offline' : '🟡 Checking...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="close-error">×</button>
          </div>
        )}

        <Routes>
          {/* Public Routes - No Authentication Required */}
          <Route 
            path="/" 
            element={
              <StockList 
                stocks={stocks} 
                loading={loading} 
                onRefresh={fetchStocks}
                error={error}
              />
            } 
          />
          
          <Route 
            path="/stocks/:symbol" 
            element={<StockDetail />} 
          />
          
          <Route 
            path="/predictions" 
            element={<PredictionDashboard />} 
          />
          
          <Route 
            path="/add-stock" 
            element={<AddStock onStockAdded={fetchStocks} />} 
          />

          {/* Admin Routes - Require Authentication */}
          <Route 
            path="/admin/login" 
            element={
              <AdminLogin 
                onLogin={handleAdminLogin}
                isAuthenticated={adminAuth.isAuthenticated}
              />
            } 
          />
          
          {adminAuth.isAuthenticated && (
            <>
              <Route 
                path="/admin/dashboard" 
                element={
                  <AdminDashboard 
                    user={adminAuth.user}
                    onLogout={handleAdminLogout}
                  />
                } 
              />
              
              <Route 
                path="/admin/users" 
                element={
                  <AdminUsers 
                    user={adminAuth.user}
                    onLogout={handleAdminLogout}
                  />
                } 
              />
              
              <Route 
                path="/admin/settings" 
                element={
                  <AdminSettings 
                    user={adminAuth.user}
                    onLogout={handleAdminLogout}
                  />
                } 
              />
            </>
          )}

          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              <div className="not-found">
                <h2>404 - Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" className="btn btn-primary">Go Home</Link>
              </div>
            } 
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2024 StockVision Pro - Information Sharing Platform</p>
          <p>All stock data and predictions are publicly accessible</p>
        </div>
      </footer>
    </div>
  );
}

export default App;