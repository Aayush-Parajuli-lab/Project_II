/**
 * AddStock Component
 * 
 * This component provides a form interface for adding new stocks to the database.
 * Features:
 * - Form validation for required fields
 * - Real-time validation feedback
 * - Integration with backend API
 * - Success/error handling with user feedback
 * - Responsive design with modern styling
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddStock = ({ onAddStock }) => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    company_name: '',
    sector: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  // Common sectors for the dropdown
  const commonSectors = [
    'Technology',
    'Healthcare',
    'Financial Services',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Utilities',
    'Industrials',
    'Materials',
    'Real Estate',
    'Telecommunications',
    'Transportation',
    'E-commerce',
    'Entertainment',
    'Automotive',
    'Aerospace',
    'Pharmaceuticals',
    'Software',
    'Hardware',
    'Biotechnology'
  ];

  /**
   * Handle input changes with real-time validation
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value.trim()
    }));

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // Clear general message
    if (message) {
      setMessage(null);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    // Symbol validation
    if (!formData.symbol) {
      newErrors.symbol = 'Stock symbol is required';
    } else if (formData.symbol.length < 1 || formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol must be 1-10 characters';
    } else if (!/^[A-Z0-9]+$/.test(formData.symbol.toUpperCase())) {
      newErrors.symbol = 'Symbol must contain only letters and numbers';
    }

    // Company name validation
    if (!formData.company_name) {
      newErrors.company_name = 'Company name is required';
    } else if (formData.company_name.length < 2) {
      newErrors.company_name = 'Company name must be at least 2 characters';
    } else if (formData.company_name.length > 255) {
      newErrors.company_name = 'Company name must be less than 255 characters';
    }

    // Sector validation (optional but if provided, must be valid)
    if (formData.sector && formData.sector.length > 100) {
      newErrors.sector = 'Sector must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Please fix the errors below'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.log('➕ Adding new stock:', formData);

      // Prepare data with uppercase symbol
      const stockData = {
        ...formData,
        symbol: formData.symbol.toUpperCase(),
        sector: formData.sector || null
      };

      // Call the parent function to add stock
      const result = await onAddStock(stockData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ Stock ${stockData.symbol} added successfully!`
        });

        // Reset form
        setFormData({
          symbol: '',
          company_name: '',
          sector: ''
        });

        // Redirect to home after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } else {
        throw new Error(result.error || 'Failed to add stock');
      }

    } catch (error) {
      console.error('❌ Error adding stock:', error);
      
      let errorMessage = 'Failed to add stock. Please try again.';
      
      if (error.includes('already exists') || error.includes('duplicate')) {
        errorMessage = `Stock symbol ${formData.symbol.toUpperCase()} already exists in the database.`;
      } else if (error.includes('network') || error.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    setFormData({
      symbol: '',
      company_name: '',
      sector: ''
    });
    setErrors({});
    setMessage(null);
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="card mb-xl">
        <div className="card-header">
          <h1 className="card-title">➕ Add New Stock</h1>
          <p className="card-subtitle">
            Add a new stock to track and generate predictions using Random Forest ML
          </p>
        </div>
      </div>

      {/* Add Stock Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Form Section */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Stock Symbol */}
            <div className="form-group">
              <label htmlFor="symbol" className="form-label">
                📈 Stock Symbol *
              </label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                className={`form-input ${errors.symbol ? 'border-danger' : ''}`}
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="e.g., AAPL, GOOGL, MSFT"
                maxLength="10"
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
              />
              {errors.symbol && (
                <div className="text-danger text-sm mt-sm">
                  {errors.symbol}
                </div>
              )}
              <div className="text-muted text-sm mt-sm">
                Enter the stock ticker symbol (1-10 characters, letters and numbers only)
              </div>
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label htmlFor="company_name" className="form-label">
                🏢 Company Name *
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                className={`form-input ${errors.company_name ? 'border-danger' : ''}`}
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="e.g., Apple Inc., Google LLC, Microsoft Corporation"
                maxLength="255"
                disabled={loading}
              />
              {errors.company_name && (
                <div className="text-danger text-sm mt-sm">
                  {errors.company_name}
                </div>
              )}
              <div className="text-muted text-sm mt-sm">
                Enter the full legal name of the company
              </div>
            </div>

            {/* Sector */}
            <div className="form-group">
              <label htmlFor="sector" className="form-label">
                🏭 Sector (Optional)
              </label>
              <select
                id="sector"
                name="sector"
                className={`form-select ${errors.sector ? 'border-danger' : ''}`}
                value={formData.sector}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Select a sector...</option>
                {commonSectors.map(sector => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              {errors.sector && (
                <div className="text-danger text-sm mt-sm">
                  {errors.sector}
                </div>
              )}
              <div className="text-muted text-sm mt-sm">
                Choose the industry sector this company belongs to
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`${message.type === 'success' ? 'success-message' : 'error-message'}`}>
                {message.text}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-md">
              <button 
                type="submit" 
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Adding Stock...
                  </>
                ) : (
                  <>
                    ➕ Add Stock
                  </>
                )}
              </button>
              
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={loading}
              >
                🔄 Reset
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="space-y-lg">
          {/* Instructions Card */}
          <div className="card">
            <h3 className="card-title">📋 Instructions</h3>
            <div className="space-y-md">
              <div className="flex items-start gap-md">
                <span className="text-primary">1️⃣</span>
                <div>
                  <strong>Stock Symbol:</strong> Enter the ticker symbol exactly as it appears on the stock exchange (e.g., AAPL for Apple Inc.)
                </div>
              </div>
              
              <div className="flex items-start gap-md">
                <span className="text-primary">2️⃣</span>
                <div>
                  <strong>Company Name:</strong> Provide the full legal name of the company for accurate identification
                </div>
              </div>
              
              <div className="flex items-start gap-md">
                <span className="text-primary">3️⃣</span>
                <div>
                  <strong>Sector:</strong> Optionally categorize the stock by industry sector for better organization
                </div>
              </div>
            </div>
          </div>

          {/* Features Card */}
          <div className="card">
            <h3 className="card-title">🚀 What Happens Next</h3>
            <div className="space-y-md">
              <div className="flex items-start gap-md">
                <span className="text-success">🌲</span>
                <div>
                  <strong>ML Predictions:</strong> Random Forest algorithm will analyze historical data to generate price predictions
                </div>
              </div>
              
              <div className="flex items-start gap-md">
                <span className="text-success">📊</span>
                <div>
                  <strong>Real-time Data:</strong> Fetch live market data from Yahoo Finance API
                </div>
              </div>
              
              <div className="flex items-start gap-md">
                <span className="text-success">🔀</span>
                <div>
                  <strong>Sorting & Analysis:</strong> Use advanced sorting algorithms to organize and analyze stock data
                </div>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="card">
            <h3 className="card-title">💡 Tips</h3>
            <div className="space-y-md text-secondary">
              <p>• Use official ticker symbols from major exchanges (NYSE, NASDAQ, etc.)</p>
              <p>• Double-check spelling to avoid duplicate entries</p>
              <p>• The system will automatically fetch market cap and other data</p>
              <p>• You can add historical data after creating the stock entry</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mt-xl">
        <button
          onClick={() => navigate('/')}
          className="card text-center hover:scale-105 cursor-pointer"
        >
          <h3 className="text-primary">🏠 Back to Dashboard</h3>
          <p className="text-secondary mt-sm">
            Return to the main stock listing and predictions
          </p>
        </button>

        <button
          onClick={() => navigate('/predictions')}
          className="card text-center hover:scale-105 cursor-pointer"
        >
          <h3 className="text-primary">🔮 View Predictions</h3>
          <p className="text-secondary mt-sm">
            See existing Random Forest predictions
          </p>
        </button>
      </div>
    </div>
  );
};

export default AddStock;