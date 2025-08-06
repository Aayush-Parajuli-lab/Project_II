/**
 * AdminLogin Component
 * 
 * Admin authentication interface with secure login
 * Default credentials: username: admin, password: admin123
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/admin/login', formData);

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token in localStorage
        localStorage.setItem('adminToken', token);
        
        // Update auth state
        onLogin({
          isAuthenticated: true,
          token,
          user
        });

        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(
        error.response?.data?.error || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">🔐 Admin Login</h1>
          <p className="text-secondary">StockPredict AI Administration</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Username */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              👤 Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter admin username"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              🔒 Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter admin password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button 
            type="submit" 
            className="btn btn-primary w-full py-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              <>🚀 Login to Admin Panel</>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-tertiary rounded-lg">
          <h4 className="text-sm font-bold mb-2 text-warning">🧪 Demo Credentials</h4>
          <div className="text-sm space-y-1">
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </div>

        {/* Back to Main App */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-secondary hover:text-primary transition-colors"
          >
            ← Back to Stock Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;