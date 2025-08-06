/**
 * SortingDemo Component
 * 
 * Interactive demonstration of sorting algorithms with performance metrics
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SortingDemo = ({ stocks }) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('quick');
  const [sortBy, setSortBy] = useState('symbol_asc');
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const algorithms = [
    { id: 'quick', name: 'Quick Sort', complexity: 'O(n log n) avg', description: 'Divide and conquer algorithm' },
    { id: 'merge', name: 'Merge Sort', complexity: 'O(n log n)', description: 'Stable sort, guaranteed performance' },
    { id: 'heap', name: 'Heap Sort', complexity: 'O(n log n)', description: 'In-place sorting algorithm' },
    { id: 'bubble', name: 'Bubble Sort', complexity: 'O(n²)', description: 'Simple comparison-based sort' }
  ];

  const runBenchmark = async () => {
    if (stocks.length === 0) {
      alert('No stocks available for benchmark. Please add some stocks first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/sort/algorithms/benchmark', {
        params: { sortBy }
      });

      if (response.data.success) {
        setBenchmarkResults(response.data.data);
      }
    } catch (error) {
      console.error('Error running benchmark:', error);
      alert('Failed to run benchmark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="card mb-xl">
        <div className="card-header">
          <div>
            <h1 className="card-title">🔀 Sorting Algorithm Demo</h1>
            <p className="card-subtitle">
              Interactive demonstration of sorting algorithms with performance comparison
            </p>
          </div>
          <Link to="/" className="btn btn-secondary">
            🏠 Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Algorithm Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
        {algorithms.map(algorithm => (
          <div 
            key={algorithm.id}
            className={`card cursor-pointer transition-all ${
              selectedAlgorithm === algorithm.id ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedAlgorithm(algorithm.id)}
          >
            <h3 className="card-title">{algorithm.name}</h3>
            <p className="text-secondary mb-sm">{algorithm.complexity}</p>
            <p className="text-sm text-muted">{algorithm.description}</p>
            {selectedAlgorithm === algorithm.id && (
              <div className="mt-md text-center">
                <span className="text-primary">✓ Selected</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card mb-xl">
        <h3 className="card-title">⚙️ Benchmark Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="form-group">
            <label className="form-label">Sort Criteria</label>
            <select 
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="symbol_asc">Symbol (A-Z)</option>
              <option value="name_asc">Company Name (A-Z)</option>
              <option value="market_cap_desc">Market Cap (High-Low)</option>
              <option value="sector_asc">Sector (A-Z)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Data Size</label>
            <input 
              type="text" 
              className="form-input" 
              value={`${stocks.length} stocks`} 
              readOnly 
            />
          </div>

          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button 
              className="btn btn-primary w-full"
              onClick={runBenchmark}
              disabled={loading || stocks.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Running...
                </>
              ) : (
                '🏁 Run Benchmark'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark Results */}
      {benchmarkResults && (
        <div className="card">
          <h3 className="card-title">📊 Benchmark Results</h3>
          <div className="mb-lg">
            <p className="text-secondary">
              Sorted {benchmarkResults.itemCount} items by {benchmarkResults.sortCriteria}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            {Object.entries(benchmarkResults.results).map(([algorithm, time]) => (
              <div key={algorithm} className="p-lg bg-tertiary rounded text-center">
                <h4 className="text-primary mb-sm">
                  {algorithms.find(a => a.id === algorithm)?.name || algorithm}
                </h4>
                <div className="text-2xl font-bold text-success mb-sm">
                  {time}ms
                </div>
                <div className="text-sm text-secondary">
                  {algorithms.find(a => a.id === algorithm)?.complexity}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-lg p-md bg-secondary rounded">
            <h4 className="text-sm font-bold mb-sm">🏆 Performance Analysis</h4>
            <p className="text-sm text-secondary">
              {benchmarkResults.results.quick < benchmarkResults.results.merge 
                ? 'Quick Sort performed better for this dataset size.' 
                : 'Merge Sort showed consistent performance.'}
              {benchmarkResults.results.bubble && 
                ` Bubble Sort (${benchmarkResults.results.bubble}ms) demonstrates O(n²) complexity.`}
            </p>
          </div>
        </div>
      )}

      {/* Algorithm Explanation */}
      <div className="card mt-xl">
        <h3 className="card-title">📚 Algorithm Explanations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div>
            <h4 className="text-primary mb-md">⚡ Quick Sort</h4>
            <p className="text-sm text-secondary mb-md">
              A divide-and-conquer algorithm that picks a pivot element and partitions 
              the array around it. Average case O(n log n), worst case O(n²).
            </p>
            
            <h4 className="text-primary mb-md">🔄 Merge Sort</h4>
            <p className="text-sm text-secondary">
              Divides the array into halves, sorts them recursively, and merges them back. 
              Guaranteed O(n log n) time complexity and stable sorting.
            </p>
          </div>
          <div>
            <h4 className="text-primary mb-md">🏗️ Heap Sort</h4>
            <p className="text-sm text-secondary mb-md">
              Uses a binary heap data structure. Builds a max heap and repeatedly 
              extracts the maximum. O(n log n) time, O(1) space.
            </p>
            
            <h4 className="text-primary mb-md">🫧 Bubble Sort</h4>
            <p className="text-sm text-secondary">
              Simple algorithm that repeatedly steps through the list, compares adjacent 
              elements and swaps them if they're in wrong order. O(n²) complexity.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      {stocks.length === 0 && (
        <div className="card mt-xl text-center">
          <h3 className="text-warning">⚠️ No Data Available</h3>
          <p className="text-secondary mt-md">
            Add some stocks to see the sorting algorithms in action!
          </p>
          <Link to="/add-stock" className="btn btn-primary mt-lg">
            ➕ Add Stocks
          </Link>
        </div>
      )}
    </div>
  );
};

export default SortingDemo;