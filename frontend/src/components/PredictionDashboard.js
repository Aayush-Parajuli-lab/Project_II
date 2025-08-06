/**
 * PredictionDashboard Component - Placeholder
 * 
 * This component displays all Random Forest predictions across stocks
 */

import React from 'react';
import { Link } from 'react-router-dom';

const PredictionDashboard = () => {
  return (
    <div className="fade-in">
      <div className="card text-center">
        <h1 className="card-title">🔮 Prediction Dashboard</h1>
        <p className="card-subtitle">Random Forest ML predictions for all stocks</p>
        
        <div className="mt-xl">
          <h3 className="text-primary">🚧 Coming Soon</h3>
          <p className="text-secondary mt-md">
            This dashboard will display comprehensive prediction analytics, 
            accuracy metrics, and visualizations.
          </p>
          
          <Link to="/" className="btn btn-primary mt-lg">
            🏠 Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard;