/**
 * AdminDashboard Component
 * 
 * Main admin dashboard with system statistics and management tools
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = ({ adminAuth }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!adminAuth.isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardData();
  }, [adminAuth.isAuthenticated, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminAuth.token}` }
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/admin/logout', {}, {
        headers: { Authorization: `Bearer ${adminAuth.token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <div className="loading-spinner"></div>
          <p className="mt-md">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <h2 className="text-danger">❌ {error}</h2>
          <button 
            onClick={fetchDashboardData}
            className="btn btn-primary mt-lg"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      {/* Admin Header */}
      <header className="bg-slate-800 border-b border-blue-600 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">🛠️ Admin Dashboard</h1>
            <p className="text-secondary">Welcome, {adminAuth.user?.username}</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="btn btn-secondary">
              🏠 Main Site
            </Link>
            <button onClick={handleLogout} className="btn btn-danger">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-primary mb-2">
              {dashboardData?.statistics?.totalStocks || 0}
            </h3>
            <p className="text-secondary">Total Stocks</p>
          </div>
          
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-success mb-2">
              {dashboardData?.statistics?.totalPredictions || 0}
            </h3>
            <p className="text-secondary">Predictions Made</p>
          </div>
          
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-warning mb-2">
              {dashboardData?.statistics?.totalUsers || 0}
            </h3>
            <p className="text-secondary">Registered Users</p>
          </div>
          
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-info mb-2">
              {Math.round(dashboardData?.statistics?.averageConfidence || 0)}%
            </h3>
            <p className="text-secondary">Avg Confidence</p>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="card-title">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/admin/users" className="btn btn-primary w-full">
                👥 Manage Users
              </Link>
              <Link to="/admin/settings" className="btn btn-secondary w-full">
                ⚙️ System Settings
              </Link>
              <button 
                onClick={fetchDashboardData}
                className="btn btn-success w-full"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <h3 className="card-title">🔧 System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-success">✅ Connected</span>
              </div>
              <div className="flex justify-between">
                <span>ML Model:</span>
                <span className="text-success">✅ Ready</span>
              </div>
              <div className="flex justify-between">
                <span>API Status:</span>
                <span className="text-success">✅ Online</span>
              </div>
              <div className="flex justify-between">
                <span>High Confidence:</span>
                <span className="text-primary">
                  {dashboardData?.statistics?.highConfidencePredictions || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card">
            <h3 className="card-title">📈 Performance</h3>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {Math.round((dashboardData?.statistics?.highConfidencePredictions / 
                    Math.max(dashboardData?.statistics?.totalPredictions, 1)) * 100) || 0}%
                </div>
                <p className="text-sm text-secondary">High Confidence Rate</p>
              </div>
              <div className="text-center mt-4">
                <div className="text-lg font-bold text-primary">
                  {dashboardData?.recentPredictions?.length || 0}
                </div>
                <p className="text-sm text-secondary">Recent Predictions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Predictions */}
          <div className="card">
            <h3 className="card-title">🔮 Recent Predictions</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData?.recentPredictions?.length > 0 ? (
                dashboardData.recentPredictions.map((prediction, index) => (
                  <div key={index} className="p-3 bg-tertiary rounded flex justify-between">
                    <div>
                      <span className="font-bold text-primary">{prediction.symbol}</span>
                      <p className="text-sm text-secondary">{prediction.company_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-success">${prediction.predicted_price}</div>
                      <div className="text-sm text-secondary">{prediction.confidence_score}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-center">No recent predictions</p>
              )}
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="card">
            <h3 className="card-title">📝 Recent Admin Activity</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData?.recentActivity?.length > 0 ? (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="p-3 bg-tertiary rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-primary">{activity.username}</span>
                        <p className="text-sm">{activity.action}</p>
                      </div>
                      <div className="text-sm text-secondary">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-secondary text-center">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;