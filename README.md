# 📈 StockPredict AI - Full Stack Stock Prediction App

A comprehensive stock prediction application built with **React**, **Node.js**, **MySQL**, and **Machine Learning** algorithms. This application demonstrates advanced sorting algorithms and Random Forest-based stock price prediction.

## 🚀 Features

### 🌲 Machine Learning & Predictions
- **Random Forest Algorithm** for stock price prediction
- Technical indicators analysis (SMA, EMA, RSI, Volatility)
- Confidence scoring for predictions
- Real-time data integration with Yahoo Finance API
- Historical data analysis and pattern recognition

### 🔀 Advanced Sorting Algorithms
- **Quick Sort** - O(n log n) average case performance
- **Merge Sort** - O(n log n) guaranteed, stable sorting
- **Heap Sort** - O(n log n) in-place sorting
- **Bubble Sort** - O(n²) simple comparison sort
- **Smart Sort** - Automatically chooses optimal algorithm
- Performance benchmarking and comparison tools

### 🎨 Modern Frontend
- **React 18** with functional components and hooks
- **Responsive design** with CSS Grid and Flexbox
- **Dark theme** with professional color scheme
- **Interactive UI** with smooth animations
- **Real-time updates** and loading states

### 🔧 Robust Backend
- **Node.js** with Express.js framework
- **MySQL** database with optimized schema
- **RESTful API** design with proper error handling
- **CORS** configuration for frontend integration
- **Scheduled tasks** for automatic data updates

## 🛠️ Tech Stack

### Frontend
- **React** 18.2.0 - UI library
- **React Router** 6.21.1 - Client-side routing
- **Axios** 1.6.2 - HTTP client
- **Chart.js** 4.4.0 - Data visualization (planned)
- **CSS3** - Modern styling with custom properties

### Backend
- **Node.js** - Runtime environment
- **Express.js** 4.18.2 - Web framework
- **MySQL2** 3.6.5 - Database driver
- **Yahoo Finance API** 2.4.3 - Real-time stock data
- **Node-cron** 3.0.3 - Scheduled tasks

### Machine Learning
- **ml-random-forest** 2.1.0 - Random Forest implementation
- **ml-matrix** 6.10.9 - Matrix operations
- **mathjs** 12.2.1 - Mathematical computations

### Database
- **MySQL** 8.0+ - Relational database
- Optimized schema with indexes
- Foreign key constraints
- Sample data included

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** 16.0+ installed
- **MySQL** 8.0+ installed and running
- **npm** or **yarn** package manager
- Basic knowledge of React and Node.js

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Aayush-Parajuli-lab/Project_II.git
cd Project_II
```

### 2. Database Setup
```bash
# Start MySQL service
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS

# Create database
mysql -u root -p
```

```sql
-- Run the database schema
source ./database_schema.sql;
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file (optional)
touch .env
```

Add to `.env` (optional):
```env
PORT=8081
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stock_prediction_db
DB_PORT=3306
```

### 4. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server will start on http://localhost:8081
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend will start on http://localhost:3000
```

## 📊 Database Schema

The application uses a well-structured MySQL database:

### Tables
- **stocks** - Basic stock information (symbol, company, sector)
- **historical_data** - Daily OHLCV data for technical analysis
- **predictions** - ML-generated price predictions with confidence scores
- **users** - User management (optional)
- **watchlist** - User stock preferences (optional)

### Key Features
- Foreign key relationships
- Indexed columns for performance
- Sample data for immediate testing
- Prepared for scaling

## 🔗 API Endpoints

### Stock Management
- `GET /api/stocks` - List all stocks with sorting
- `GET /api/stocks/:symbol` - Get specific stock details
- `POST /api/stocks` - Add new stock
- `POST /api/fetch-realtime/:symbol` - Fetch live data

### Predictions
- `POST /api/predict/:symbol` - Generate Random Forest prediction
- `GET /api/predictions/:symbol` - Get historical predictions

### Sorting Algorithms
- `POST /api/sort/stocks` - Sort stocks using various algorithms
- `GET /api/sort/algorithms/benchmark` - Performance benchmark
- `GET /api/sort/criteria` - Available sorting options

### Utility
- `GET /api/health` - Server health check
- `GET /api/model/info` - ML model information

## 🔮 Random Forest Algorithm

Our Random Forest implementation uses these features:

### Technical Indicators
- **SMA** (5, 10, 20 days) - Simple Moving Averages
- **EMA** (12, 26 days) - Exponential Moving Averages
- **RSI** (14 days) - Relative Strength Index
- **Volatility** - Price standard deviation
- **Volume Ratio** - Current vs average volume
- **Momentum** - Price change momentum
- **Price Change %** - Percentage change

### Model Configuration
- **100 estimators** (decision trees)
- **Max depth**: 10 levels
- **Min samples per leaf**: 1
- **Feature selection**: Square root of features
- **Seed**: 42 (reproducible results)

## 🔀 Sorting Algorithms

### Implementation Details

#### Quick Sort
- **Time Complexity**: O(n log n) average, O(n²) worst case
- **Space Complexity**: O(log n)
- **Type**: Divide and conquer, in-place
- **Best for**: General purpose, good average performance

#### Merge Sort
- **Time Complexity**: O(n log n) guaranteed
- **Space Complexity**: O(n)
- **Type**: Divide and conquer, stable
- **Best for**: When stability is required, predictable performance

#### Heap Sort
- **Time Complexity**: O(n log n) guaranteed
- **Space Complexity**: O(1)
- **Type**: Comparison-based, in-place
- **Best for**: Memory-constrained environments

#### Bubble Sort
- **Time Complexity**: O(n²)
- **Space Complexity**: O(1)
- **Type**: Simple comparison, stable
- **Best for**: Educational purposes, very small datasets

#### Smart Sort
- **Adaptive algorithm selection**
- ≤10 items: Bubble Sort
- ≤1000 items: Quick Sort
- >1000 items: Merge Sort

## 🎯 Usage Examples

### Adding a New Stock
1. Navigate to "Add Stock" page
2. Enter stock symbol (e.g., AAPL)
3. Enter company name (e.g., Apple Inc.)
4. Select sector (optional)
5. Click "Add Stock"

### Generating Predictions
1. Go to stock details page
2. Click "Generate Prediction"
3. View predicted price and confidence
4. Historical predictions are saved automatically

### Sorting Performance
1. Visit "Sorting Demo" page
2. Select sort criteria and algorithm
3. Run benchmark to compare performance
4. View detailed metrics and analysis

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Check port 8081 is available: `lsof -i :8081`

**Frontend connection errors:**
- Ensure backend is running on port 8081
- Check CORS configuration
- Verify proxy setting in package.json

**Prediction errors:**
- Need minimum 50 historical data points
- Add sample data or fetch real-time data first
- Check ML model training logs

**Database connection issues:**
- Verify MySQL credentials
- Check .env file configuration
- Ensure database permissions

## 📈 Performance Optimization

### Database
- Indexed columns for fast queries
- Connection pooling (max 10 connections)
- Optimized schema design

### Backend
- Async/await for non-blocking operations
- Error handling middleware
- Request timeout (60 seconds)

### Frontend
- Component memoization planned
- Lazy loading for routes
- Optimized re-renders

## 🔮 Future Enhancements

### Planned Features
- **Advanced Charts** - Interactive price and prediction charts
- **More ML Models** - LSTM, SVM, Linear Regression
- **Real-time Updates** - WebSocket integration
- **User Authentication** - Login/signup system
- **Portfolio Tracking** - Personal stock portfolios
- **Mobile App** - React Native implementation

### Algorithm Improvements
- **Feature Engineering** - More technical indicators
- **Model Ensemble** - Combine multiple ML models
- **Auto-retraining** - Periodic model updates
- **Backtesting** - Historical accuracy testing

## 🤝 Contributing

### Commit Message Guidelines

We follow a structured commit format for better tracking:

```
feat: add Random Forest prediction algorithm
fix: resolve database connection timeout issue
docs: update API documentation
style: improve CSS responsiveness
refactor: optimize sorting algorithm performance
test: add unit tests for prediction endpoints
chore: update dependencies
```

### Commit Types
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation updates
- **style**: Code formatting, CSS changes
- **refactor**: Code refactoring
- **test**: Adding tests
- **chore**: Maintenance tasks

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-algorithm`
3. Make changes with proper commit messages
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is for educational purposes. Not intended as financial advice.

## 👨‍💻 Author

**Aayush Parajuli**
- GitHub: [@Aayush-Parajuli-lab](https://github.com/Aayush-Parajuli-lab)
- Project: Academic Full-Stack Development

## 🙏 Acknowledgments

- **Yahoo Finance** for stock data API
- **ml-js** community for machine learning libraries
- **React** and **Node.js** communities
- **MySQL** for reliable database solutions

---

**⚠️ Disclaimer**: This application is for educational purposes only. Stock predictions are not financial advice. Always consult with financial professionals before making investment decisions.

**📊 Educational Focus**: This project demonstrates full-stack development concepts, machine learning integration, algorithm implementation, and modern web development practices.
