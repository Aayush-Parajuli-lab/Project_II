/**
 * Sorting Algorithms for Stock Data
 * 
 * This module provides various sorting algorithms for organizing stock data
 * by different criteria such as price, volume, market cap, percentage change, etc.
 * 
 * Algorithms implemented:
 * - Quick Sort (most efficient for large datasets)
 * - Merge Sort (stable sort)
 * - Bubble Sort (simple but less efficient)
 * - Heap Sort (guaranteed O(n log n))
 */

import { performance as nodePerformance } from 'node:perf_hooks';
const perf = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
  ? performance
  : nodePerformance;

export class StockSorter {
    constructor() {
        this.compareFunctions = {
            // Price-based comparisons
            'price_asc': (a, b) => parseFloat(a.close_price || a.current_price || 0) - parseFloat(b.close_price || b.current_price || 0),
            'price_desc': (a, b) => parseFloat(b.close_price || b.current_price || 0) - parseFloat(a.close_price || a.current_price || 0),
            
            // Volume-based comparisons
            'volume_asc': (a, b) => parseFloat(a.volume || 0) - parseFloat(b.volume || 0),
            'volume_desc': (a, b) => parseFloat(b.volume || 0) - parseFloat(a.volume || 0),
            
            // Market cap comparisons
            'market_cap_asc': (a, b) => parseFloat(a.market_cap || 0) - parseFloat(b.market_cap || 0),
            'market_cap_desc': (a, b) => parseFloat(b.market_cap || 0) - parseFloat(a.market_cap || 0),
            
            // Symbol/Name alphabetical
            'symbol_asc': (a, b) => (a.symbol || '').localeCompare(b.symbol || ''),
            'symbol_desc': (a, b) => (b.symbol || '').localeCompare(a.symbol || ''),
            'name_asc': (a, b) => (a.company_name || '').localeCompare(b.company_name || ''),
            'name_desc': (a, b) => (b.company_name || '').localeCompare(a.company_name || ''),
            
            // Sector-based
            'sector_asc': (a, b) => (a.sector || '').localeCompare(b.sector || ''),
            'sector_desc': (a, b) => (b.sector || '').localeCompare(a.sector || ''),
            
            // Date-based
            'date_asc': (a, b) => new Date(a.date || a.created_at || 0) - new Date(b.date || b.created_at || 0),
            'date_desc': (a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0),
            
            // Percentage change (if available)
            'change_asc': (a, b) => parseFloat(a.change_percent || 0) - parseFloat(b.change_percent || 0),
            'change_desc': (a, b) => parseFloat(b.change_percent || 0) - parseFloat(a.change_percent || 0)
        };
    }

    /**
     * Quick Sort Algorithm
     * Time Complexity: Average O(n log n), Worst O(n²)
     * Space Complexity: O(log n)
     * 
     * @param {Array} arr - Array to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted array
     */
    quickSort(arr, sortBy = 'symbol_asc') {
        console.log(`🚀 Quick Sort: Sorting ${arr.length} stocks by ${sortBy}`);
        
        if (arr.length <= 1) return arr;
        
        const compareFunc = this.compareFunctions[sortBy];
        if (!compareFunc) {
            throw new Error(`Invalid sort criteria: ${sortBy}`);
        }
        
        return this._quickSortRecursive([...arr], 0, arr.length - 1, compareFunc);
    }

    _quickSortRecursive(arr, low, high, compareFunc) {
        if (low < high) {
            const pivotIndex = this._partition(arr, low, high, compareFunc);
            this._quickSortRecursive(arr, low, pivotIndex - 1, compareFunc);
            this._quickSortRecursive(arr, pivotIndex + 1, high, compareFunc);
        }
        return arr;
    }

    _partition(arr, low, high, compareFunc) {
        const pivot = arr[high];
        let i = low - 1;
        
        for (let j = low; j < high; j++) {
            if (compareFunc(arr[j], pivot) <= 0) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
        
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        return i + 1;
    }

    /**
     * Merge Sort Algorithm
     * Time Complexity: O(n log n)
     * Space Complexity: O(n)
     * Stable sort - maintains relative order of equal elements
     * 
     * @param {Array} arr - Array to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted array
     */
    mergeSort(arr, sortBy = 'symbol_asc') {
        console.log(`🔄 Merge Sort: Sorting ${arr.length} stocks by ${sortBy}`);
        
        const compareFunc = this.compareFunctions[sortBy];
        if (!compareFunc) {
            throw new Error(`Invalid sort criteria: ${sortBy}`);
        }
        
        return this._mergeSortRecursive([...arr], compareFunc);
    }

    _mergeSortRecursive(arr, compareFunc) {
        if (arr.length <= 1) return arr;
        
        const mid = Math.floor(arr.length / 2);
        const left = this._mergeSortRecursive(arr.slice(0, mid), compareFunc);
        const right = this._mergeSortRecursive(arr.slice(mid), compareFunc);
        
        return this._merge(left, right, compareFunc);
    }

    _merge(left, right, compareFunc) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;
        
        while (leftIndex < left.length && rightIndex < right.length) {
            if (compareFunc(left[leftIndex], right[rightIndex]) <= 0) {
                result.push(left[leftIndex]);
                leftIndex++;
            } else {
                result.push(right[rightIndex]);
                rightIndex++;
            }
        }
        
        return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
    }

    /**
     * Bubble Sort Algorithm
     * Time Complexity: O(n²)
     * Space Complexity: O(1)
     * Simple but inefficient for large datasets
     * 
     * @param {Array} arr - Array to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted array
     */
    bubbleSort(arr, sortBy = 'symbol_asc') {
        console.log(`🫧 Bubble Sort: Sorting ${arr.length} stocks by ${sortBy}`);
        
        const compareFunc = this.compareFunctions[sortBy];
        if (!compareFunc) {
            throw new Error(`Invalid sort criteria: ${sortBy}`);
        }
        
        const sortedArr = [...arr];
        const n = sortedArr.length;
        
        for (let i = 0; i < n - 1; i++) {
            let swapped = false;
            
            for (let j = 0; j < n - i - 1; j++) {
                if (compareFunc(sortedArr[j], sortedArr[j + 1]) > 0) {
                    [sortedArr[j], sortedArr[j + 1]] = [sortedArr[j + 1], sortedArr[j]];
                    swapped = true;
                }
            }
            
            // If no swaps occurred, array is sorted
            if (!swapped) break;
        }
        
        return sortedArr;
    }

    /**
     * Heap Sort Algorithm
     * Time Complexity: O(n log n)
     * Space Complexity: O(1)
     * Not stable but guaranteed O(n log n) performance
     * 
     * @param {Array} arr - Array to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted array
     */
    heapSort(arr, sortBy = 'symbol_asc') {
        console.log(`🏗️ Heap Sort: Sorting ${arr.length} stocks by ${sortBy}`);
        
        const compareFunc = this.compareFunctions[sortBy];
        if (!compareFunc) {
            throw new Error(`Invalid sort criteria: ${sortBy}`);
        }
        
        const sortedArr = [...arr];
        const n = sortedArr.length;
        
        // Build heap (rearrange array)
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            this._heapify(sortedArr, n, i, compareFunc);
        }
        
        // Extract elements from heap one by one
        for (let i = n - 1; i > 0; i--) {
            [sortedArr[0], sortedArr[i]] = [sortedArr[i], sortedArr[0]];
            this._heapify(sortedArr, i, 0, compareFunc);
        }
        
        return sortedArr;
    }

    _heapify(arr, n, i, compareFunc) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        
        if (left < n && compareFunc(arr[left], arr[largest]) > 0) {
            largest = left;
        }
        
        if (right < n && compareFunc(arr[right], arr[largest]) > 0) {
            largest = right;
        }
        
        if (largest !== i) {
            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            this._heapify(arr, n, largest, compareFunc);
        }
    }

    /**
     * Smart Sort - Automatically chooses the best algorithm based on data size and type
     * 
     * @param {Array} arr - Array to sort
     * @param {string} sortBy - Sort criteria
     * @param {string} preferredAlgorithm - Force specific algorithm (optional)
     * @returns {Object} Results with sorted array and performance metrics
     */
    smartSort(arr, sortBy = 'symbol_asc', preferredAlgorithm = null) {
        const startTime = perf.now();
        
        let algorithm;
        let sortedArray;
        
        if (preferredAlgorithm) {
            algorithm = preferredAlgorithm;
        } else {
            // Choose algorithm based on array size
            if (arr.length <= 10) {
                algorithm = 'bubble';
            } else if (arr.length <= 1000) {
                algorithm = 'quick';
            } else {
                algorithm = 'merge'; // More stable for large datasets
            }
        }
        
        console.log(`🧠 Smart Sort: Using ${algorithm} sort for ${arr.length} items`);
        
        switch (algorithm) {
            case 'quick':
                sortedArray = this.quickSort(arr, sortBy);
                break;
            case 'merge':
                sortedArray = this.mergeSort(arr, sortBy);
                break;
            case 'bubble':
                sortedArray = this.bubbleSort(arr, sortBy);
                break;
            case 'heap':
                sortedArray = this.heapSort(arr, sortBy);
                break;
            default:
                sortedArray = this.quickSort(arr, sortBy);
                algorithm = 'quick';
        }
        
        const endTime = perf.now();
        const executionTime = endTime - startTime;
        
        console.log(`✅ Sorting completed in ${executionTime.toFixed(2)}ms using ${algorithm} sort`);
        
        return {
            sortedData: sortedArray,
            algorithm: algorithm,
            executionTime: Math.round(executionTime * 100) / 100,
            itemCount: arr.length,
            sortCriteria: sortBy,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Multi-criteria sorting (sort by multiple fields)
     * 
     * @param {Array} arr - Array to sort
     * @param {Array} criteria - Array of sort criteria in order of priority
     * @returns {Array} Sorted array
     */
    multiSort(arr, criteria = ['sector_asc', 'price_desc']) {
        console.log(`🎯 Multi-Sort: Sorting by ${criteria.join(' -> ')}`);
        
        return [...arr].sort((a, b) => {
            for (const criterion of criteria) {
                const compareFunc = this.compareFunctions[criterion];
                if (!compareFunc) continue;
                
                const result = compareFunc(a, b);
                if (result !== 0) return result;
            }
            return 0;
        });
    }

    /**
     * Get available sorting criteria
     */
    getAvailableSortCriteria() {
        return {
            price: ['price_asc', 'price_desc'],
            volume: ['volume_asc', 'volume_desc'],
            marketCap: ['market_cap_asc', 'market_cap_desc'],
            alphabetical: ['symbol_asc', 'symbol_desc', 'name_asc', 'name_desc'],
            sector: ['sector_asc', 'sector_desc'],
            date: ['date_asc', 'date_desc'],
            change: ['change_asc', 'change_desc']
        };
    }

    /**
     * Performance benchmark of different sorting algorithms
     */
    benchmarkAlgorithms(arr, sortBy = 'symbol_asc') {
        console.log(`📊 Benchmarking sorting algorithms with ${arr.length} items...`);
        
        const algorithms = ['quick', 'merge', 'heap'];
        if (arr.length <= 100) algorithms.push('bubble');
        
        const results = {};
        
        for (const algorithm of algorithms) {
            const startTime = perf.now();
            
            switch (algorithm) {
                case 'quick':
                    this.quickSort(arr, sortBy);
                    break;
                case 'merge':
                    this.mergeSort(arr, sortBy);
                    break;
                case 'bubble':
                    this.bubbleSort(arr, sortBy);
                    break;
                case 'heap':
                    this.heapSort(arr, sortBy);
                    break;
            }
            
            const endTime = perf.now();
            results[algorithm] = Math.round((endTime - startTime) * 100) / 100;
        }
        
        console.log('🏁 Benchmark Results:', results);
        return results;
    }
}