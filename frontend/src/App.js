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
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import PredictionDashboard from './components/PredictionDashboard';
import AddStock from './components/AddStock';
import GoogleAuth from './components/GoogleAuth';
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
  const [userAuth, setUserAuth] = useState({
    isAuthenticated: false,
    token: localStorage.getItem('authToken'),
    user: null
  });

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth();
    checkAdminAuth();
    checkUserAuth();
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
   * Check user authentication status
   */
  const checkUserAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await axios.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUserAuth({ isAuthenticated: true, token, user: response.data.data.user });
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      setUserAuth({ isAuthenticated: false, token: null, user: null });
    }
  };

  const logoutAdmin = () => {
    try { localStorage.removeItem('adminToken'); } catch {}
    setAdminAuth({ isAuthenticated: false, token: null, user: null });
  };

  const logoutUser = async () => {
    try { await axios.post('/api/auth/logout'); } catch {}
    try { localStorage.removeItem('authToken'); } catch {}
    setUserAuth({ isAuthenticated: false, token: null, user: null });
  };

  const handleUserAuthSuccess = (user) => {
    setUserAuth({ isAuthenticated: true, token: localStorage.getItem('authToken'), user });
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
      {/* Router provided by index.js */}
      <div className="app-container">
        {/* Header/Navigation */}
        <Header serverStatus={serverStatus} onRefreshHealth={checkServerHealth} userAuth={userAuth} onLogoutUser={logoutUser} />
        
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
            
            {/* Google/Auth Route */}
            <Route 
              path="/auth" 
              element={<GoogleAuth onAuthSuccess={handleUserAuthSuccess} />} 
            />
            <Route 
              path="/auth/success" 
              element={<GoogleAuth onAuthSuccess={handleUserAuthSuccess} />} 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/login" 
              element={<AdminLogin onLogin={setAdminAuth} />} 
            />
            <Route 
              path="/admin/dashboard" 
              element={<AdminDashboard adminAuth={adminAuth} onLogout={logoutAdmin} />} 
            />
            <Route 
              path="/admin/users" 
              element={<AdminUsers adminAuth={adminAuth} />} 
            />
            <Route 
              path="/admin/settings" 
              element={<AdminSettings adminAuth={adminAuth} />} 
            />
          </Routes>
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

/**
 * Header Component with Navigation
 */
function Header({ serverStatus, onRefreshHealth, userAuth, onLogoutUser }) {
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
            <h1 className="app-title">StockVision Pro</h1>
            <p className="app-subtitle">Advanced Market Analytics Platform</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="main-navigation">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/predictions" 
            className={`nav-link ${location.pathname === '/predictions' ? 'active' : ''}`}
          >
            Predictions
          </Link>
          <Link 
            to="/add-stock" 
            className={`nav-link ${location.pathname === '/add-stock' ? 'active' : ''}`}
          >
            Add Stock
          </Link>
          {userAuth?.isAuthenticated ? (
            <button 
              onClick={onLogoutUser}
              className="nav-link btn btn-link"
              title={userAuth.user?.email}
            >
              Logout ({userAuth.user?.name || userAuth.user?.username || 'User'})
            </button>
          ) : (
            <Link 
              to="/auth" 
              className={`nav-link ${location.pathname.startsWith('/auth') ? 'active' : ''}`}
            >
              Login
            </Link>
          )}
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
          <h4>Algorithms</h4>
          <p>Random Forest Regression</p>
          <p>Quick Sort • Merge Sort • Heap Sort</p>
        </div>
        
        <div className="footer-section">
          <h4>Data Sources</h4>
          <p>Ninja API</p>
          <p>Real-time Market Data</p>
        </div>
        
        <div className="footer-section">
          <h4>Tech Stack</h4>
          <p>React • Node.js • MySQL</p>
          <p>Google OAuth • Machine Learning</p>
        </div>
        
        <div className="footer-section">
          <h4>About</h4>
          <p>StockVision Pro v2.0</p>
          <p>Professional Market Analysis</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2024 StockVision Pro • Professional Market Analytics • Not Financial Advice</p>
      </div>
    </footer>
  );
}

export default App;
