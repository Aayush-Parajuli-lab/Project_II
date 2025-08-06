/**
 * AdminUsers Component - Placeholder
 * 
 * User management interface for admins
 */

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminUsers = ({ adminAuth }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminAuth.isAuthenticated) {
      navigate('/admin/login');
    }
  }, [adminAuth.isAuthenticated, navigate]);

  if (!adminAuth.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      {/* Admin Header */}
      <header className="bg-slate-800 border-b border-blue-600 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">👥 User Management</h1>
          <Link to="/admin/dashboard" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="card text-center">
          <h2 className="text-primary text-2xl mb-4">🚧 Coming Soon</h2>
          <p className="text-secondary mb-6">
            User management features will be implemented here, including:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 bg-tertiary rounded">
              <h4 className="text-primary">👤 User Operations</h4>
              <ul className="text-sm text-secondary mt-2 space-y-1">
                <li>• View all registered users</li>
                <li>• Activate/deactivate accounts</li>
                <li>• Modify user roles</li>
                <li>• User activity tracking</li>
              </ul>
            </div>
            <div className="p-4 bg-tertiary rounded">
              <h4 className="text-primary">📊 Analytics</h4>
              <ul className="text-sm text-secondary mt-2 space-y-1">
                <li>• User registration trends</li>
                <li>• Login activity patterns</li>
                <li>• Usage statistics</li>
                <li>• Export user data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;