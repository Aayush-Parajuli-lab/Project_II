import React from 'react';
import { Link } from 'react-router-dom';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <h1 className="welcome-title">Welcome to StockVision Pro</h1>
        <p className="welcome-subtitle">
          Advanced Market Analytics Platform with Machine Learning Predictions
        </p>
        
        <div className="welcome-features">
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Data</h3>
              <p>Get live stock prices and market data from Ninja API</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI Predictions</h3>
              <p>Random Forest algorithm for intelligent price predictions</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Secure Login</h3>
              <p>Google OAuth authentication for secure access</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Fast Algorithms</h3>
              <p>Advanced sorting algorithms for efficient data processing</p>
            </div>
          </div>
        </div>
        
        <div className="welcome-actions">
          <Link to="/auth" className="btn btn-primary btn-lg">
            Get Started with Google
          </Link>
          <Link to="/add-stock" className="btn btn-secondary btn-lg">
            Add Your First Stock
          </Link>
        </div>
        
        <div className="welcome-demo">
          <h3>Explore Features</h3>
          <div className="demo-links">
            <Link to="/predictions" className="demo-link">
              <span className="demo-icon">🔮</span>
              View Predictions
            </Link>
            <Link to="/sorting-demo" className="demo-link">
              <span className="demo-icon">🔀</span>
              Algorithm Demo
            </Link>
          </div>
        </div>
      </div>
      
      <div className="welcome-stats">
        <div className="stat-item">
          <div className="stat-number">100+</div>
          <div className="stat-label">Algorithms</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">Real-time</div>
          <div className="stat-label">Market Data</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">ML-Powered</div>
          <div className="stat-label">Predictions</div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;