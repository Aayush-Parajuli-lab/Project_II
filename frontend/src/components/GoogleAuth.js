import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const GoogleAuth = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '', username: '', email: '' });
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await axios.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUser(response.data.data.user);
        if (onAuthSuccess) {
          onAuthSuccess(response.data.data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    }
  }, [onAuthSuccess]);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
    
    // Check for auth success callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      localStorage.setItem('authToken', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuthStatus();
    }

    // Check Google availability
    axios.get('/api/auth/google/status')
      .then(res => setGoogleAvailable(!!res.data?.configured))
      .catch(() => setGoogleAvailable(false));
  }, [checkAuthStatus]);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirect to Google OAuth (absolute backend URL)
    const apiBase = (axios.defaults.baseURL || 'http://localhost:8081').replace(/\/$/, '');
    window.location.assign(`${apiBase}/api/auth/google`);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      localStorage.removeItem('authToken');
      setUser(null);
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still remove token and user on client side
      localStorage.removeItem('authToken');
      setUser(null);
      window.location.reload();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        if (isAdminMode) {
          // Admin login via /api/admin/login
          const payload = { username: formData.usernameOrEmail, password: formData.password };
          const res = await axios.post('/api/admin/login', payload);
          if (res.data.success) {
            const { token } = res.data.data;
            localStorage.setItem('adminToken', token);
            // Redirect to Admin Dashboard
            window.location.assign('/admin/dashboard');
            return;
          }
        } else {
          const payload = formData.usernameOrEmail.includes('@')
            ? { email: formData.usernameOrEmail, password: formData.password }
            : { username: formData.usernameOrEmail, password: formData.password };
          const res = await axios.post('/api/auth/login', payload);
          if (res.data.success) {
            localStorage.setItem('authToken', res.data.data.token);
            await checkAuthStatus();
          }
        }
      } else {
        if (!formData.username || !formData.email || !formData.password) {
          setError('Please fill all fields');
          setIsLoading(false);
          return;
        }
        const res = await axios.post('/api/auth/register', { username: formData.username, email: formData.email, password: formData.password });
        if (res.data.success) {
          localStorage.setItem('authToken', res.data.data.token);
          await checkAuthStatus();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <div className="user-avatar">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{user.name || user.username}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome to StockVision Pro</h2>
        <p className="auth-subtitle">Sign in or create an account</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md w-full">
          <div className="p-md">
            <h4 className="mb-sm">{mode === 'login' ? (isAdminMode ? 'Admin Login' : 'Login') : 'Create Account'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'login' ? (
                <>
                  <input
                    type="text"
                    name="usernameOrEmail"
                    className="form-input"
                    placeholder={isAdminMode ? 'Admin username' : 'Username or Email'}
                    value={formData.usernameOrEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                  <input
                    type="password"
                    name="password"
                    className="form-input"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <div className="flex items-center gap-sm">
                    <input
                      id="adminMode"
                      type="checkbox"
                      checked={isAdminMode}
                      onChange={(e) => setIsAdminMode(e.target.checked)}
                      disabled={isLoading}
                    />
                    <label htmlFor="adminMode" className="text-sm">Login as Admin</label>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    name="password"
                    className="form-input"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </>
              )}

              {error && <div className="error-message">{error}</div>}

              <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
                {isLoading ? 'Please wait...' : mode === 'login' ? (isAdminMode ? 'Login to Admin' : 'Login') : 'Create Account'}
              </button>

              <button type="button" className="btn btn-link w-full" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setIsAdminMode(false); }}>
                {mode === 'login' ? "Don't have an account? Register" : 'Have an account? Login'}
              </button>
            </form>
          </div>

          <div className="p-md border-l">
            <h4 className="mb-sm">Or continue with</h4>
            <button 
              onClick={handleGoogleLogin} 
              disabled={isLoading || !googleAvailable}
              className="google-auth-btn w-full"
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="auth-disclaimer mt-md">
              <p>By signing in, you agree to our terms of service and privacy policy.</p>
              {!googleAvailable && (
                <p className="text-sm text-warning mt-sm">Google sign-in is not configured on the server.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleAuth;