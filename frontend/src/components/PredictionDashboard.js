/**
 * PredictionDashboard Component - Placeholder
 * 
 * This component displays all Random Forest predictions across stocks
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const PredictionDashboard = () => {
  const [gainers, setGainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/stocks/predicted-gainers');
        if (res.data.success) {
          setGainers(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">🔮 Prediction Dashboard</h1>
            <p className="card-subtitle">Top predicted gainers based on Random Forest</p>
          </div>
          <Link to="/" className="btn btn-secondary">🏠 Back to Dashboard</Link>
        </div>

        {loading && <div className="p-md">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <div className="card">
              <h3 className="card-title">🚀 Predicted Gainers</h3>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Company</th>
                      <th className="text-right">Predicted Price</th>
                      <th className="text-right">Predicted Change %</th>
                      <th className="text-right">Confidence</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gainers.slice(0, 20).map(s => (
                      <tr key={s.id}>
                        <td>{s.symbol}</td>
                        <td className="text-muted">{s.company_name}</td>
                        <td className="text-right">${Number(s.predicted_price || 0).toFixed(2)}</td>
                        <td className={`text-right ${Number(s.predicted_change_percent || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {Number(s.predicted_change_percent || 0).toFixed(2)}%
                        </td>
                        <td className="text-right">{Number(s.predicted_confidence || 0).toFixed(0)}%</td>
                        <td className="text-right">
                          <Link to={`/stock/${s.symbol}`} className="btn btn-sm btn-primary">View</Link>
                        </td>
                      </tr>
                    ))}
                    {gainers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-secondary p-lg">No predictions available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">📈 Overview</h3>
              <div className="grid grid-cols-2 gap-md">
                <div className="p-md bg-tertiary rounded text-center">
                  <div className="text-sm text-secondary">Total Stocks</div>
                  <div className="text-2xl font-bold">{gainers.length}</div>
                </div>
                <div className="p-md bg-tertiary rounded text-center">
                  <div className="text-sm text-secondary">Avg Confidence</div>
                  <div className="text-2xl font-bold">
                    {gainers.length ? (
                      (gainers.reduce((a, b) => a + Number(b.predicted_confidence || 0), 0) / gainers.length).toFixed(0)
                    ) : 0}%
                  </div>
                </div>
                <div className="p-md bg-tertiary rounded text-center">
                  <div className="text-sm text-secondary">Top Gainer %</div>
                  <div className="text-2xl font-bold">
                    {gainers.length ? Math.max(...gainers.map(s => Number(s.predicted_change_percent || 0))).toFixed(2) : 0}%
                  </div>
                </div>
                <div className="p-md bg-tertiary rounded text-center">
                  <div className="text-sm text-secondary">Median Change %</div>
                  <div className="text-2xl font-bold">
                    {gainers.length ? (
                      [...gainers].sort((a,b)=>Number(a.predicted_change_percent||0)-Number(b.predicted_change_percent||0))[Math.floor(gainers.length/2)].predicted_change_percent.toFixed(2)
                    ) : 0}%
                  </div>
                </div>
              </div>

              <div className="mt-lg text-sm text-secondary">
                Charts coming soon: confidence distribution, sector performance, and accuracy over time.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionDashboard;