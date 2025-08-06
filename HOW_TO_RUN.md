# 🚀 How to Run StockPredict AI - Complete Guide

This guide provides step-by-step instructions to set up and run the complete StockPredict AI application, including the **Admin Panel**.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 16.0+ ([Download](https://nodejs.org/))
- **MySQL** 8.0+ ([Download](https://dev.mysql.com/downloads/))
- **Git** for cloning the repository
- A web browser (Chrome, Firefox, Safari, Edge)

## 🔧 Quick Setup (Automated)

### Option 1: Use the Setup Script
```bash
# Clone the repository
git clone https://github.com/Aayush-Parajuli-lab/Project_II.git
cd Project_II

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

The script will automatically:
- Check for Node.js and MySQL
- Install all dependencies
- Create environment files
- Provide database setup instructions

## 🛠️ Manual Setup (Step by Step)

### Step 1: Clone and Navigate
```bash
git clone https://github.com/Aayush-Parajuli-lab/Project_II.git
cd Project_II
```

### Step 2: Set Up MySQL Database
```bash
# Start MySQL service
# Linux/macOS:
sudo systemctl start mysql
# or
brew services start mysql

# Windows: Start MySQL from Services or MySQL Workbench

# Log into MySQL
mysql -u root -p
```

**In MySQL command line:**
```sql
-- Create the database and tables
SOURCE ./database_schema.sql;

-- Verify tables were created
USE stock_prediction_db;
SHOW TABLES;

-- Check if admin user was created
SELECT username, role FROM users WHERE role = 'admin';
```

### Step 3: Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env

# Edit .env file if needed (optional)
# nano .env
```

**Environment Variables (Optional):**
```env
PORT=8081
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stock_prediction_db
```

### Step 4: Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install
```

### Step 5: Start the Application

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
**Expected Output:**
```
🚀 Stock Prediction Server Started!
📡 Server running on http://localhost:8081
🗄️  Database: stock_prediction_db
🌲 Random Forest: Needs Training
🔀 Sorting Algorithms: Available
```

**Terminal 2 - Frontend Application:**
```bash
cd frontend
npm start
```
**Expected Output:**
```
Compiled successfully!

You can now view stock-prediction-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## 🌐 Accessing the Application

### Main Application
- **URL:** http://localhost:3000
- **Features:** Stock dashboard, predictions, sorting demos

### Admin Panel
- **URL:** http://localhost:3000/admin/login
- **Username:** `admin`
- **Password:** `admin123`

## 🎯 Application Features

### 📊 Main Dashboard
- **Stock List:** View all stocks with sorting capabilities
- **Add Stocks:** Add new stocks to track
- **Predictions:** Generate ML predictions using Random Forest
- **Sorting Demo:** Interactive algorithm demonstrations

### 🛠️ Admin Panel
- **Login:** Secure admin authentication
- **Dashboard:** System statistics and monitoring
- **User Management:** View and manage users (placeholder)
- **System Settings:** Configure application settings (placeholder)
- **Activity Logs:** Track admin actions

## 🔍 Testing the Application

### 1. Test Stock Management
```bash
# Add a new stock via the UI or API
curl -X POST http://localhost:8081/api/stocks \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TEST","company_name":"Test Company","sector":"Technology"}'
```

### 2. Test Predictions
```bash
# Generate a prediction (requires historical data)
curl -X POST http://localhost:8081/api/predict/AAPL \
  -H "Content-Type: application/json" \
  -d '{"days_ahead":1,"retrain":false}'
```

### 3. Test Sorting Algorithms
```bash
# Run sorting benchmark
curl http://localhost:8081/api/sort/algorithms/benchmark?sortBy=symbol_asc
```

### 4. Test Admin Authentication
```bash
# Admin login
curl -X POST http://localhost:8081/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🐛 Troubleshooting

### Backend Issues

**Port 8081 already in use:**
```bash
# Find and kill the process
lsof -ti:8081 | xargs kill -9
# Or change the port in .env file
```

**Database connection error:**
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**Missing ML dependencies:**
```bash
cd backend
npm install ml-random-forest ml-matrix mathjs
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# The app will offer to run on port 3001
# Or stop the other process using port 3000
```

**API connection errors:**
```bash
# Ensure backend is running on port 8081
curl http://localhost:8081/api/health
```

### Database Issues

**Admin user not found:**
```sql
-- Manually create admin user
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@stockpredict.ai', '$2b$10$dummy.hash.here', 'admin');
```

**Tables not created:**
```bash
# Re-run the schema file
mysql -u root -p stock_prediction_db < database_schema.sql
```

## 📈 Usage Examples

### 1. Adding Stocks
1. Navigate to http://localhost:3000
2. Click "Add New Stock"
3. Enter: Symbol: `MSFT`, Company: `Microsoft Corporation`, Sector: `Technology`
4. Click "Add Stock"

### 2. Generating Predictions
1. Go to stock details (click on any stock symbol)
2. Click "Generate Prediction"
3. View the predicted price and confidence score

### 3. Using Sorting Algorithms
1. Navigate to "Sorting Demo"
2. Select different algorithms (Quick Sort, Merge Sort, etc.)
3. Run benchmarks to compare performance

### 4. Admin Panel Access
1. Click "Admin" in the navigation
2. Login with: `admin` / `admin123`
3. View dashboard statistics
4. Manage users and settings

## 🔧 Configuration Options

### Backend Configuration (`.env`)
```env
# Server Settings
PORT=8081
NODE_ENV=development

# Database Settings
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stock_prediction_db

# Security
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret

# Features
ENABLE_SCHEDULED_UPDATES=true
LOG_LEVEL=info
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_stock_symbol ON stocks(symbol);
CREATE INDEX idx_prediction_date ON predictions(prediction_date);
CREATE INDEX idx_user_role ON users(role);
```

## 📊 API Endpoints Reference

### Public Endpoints
- `GET /api/health` - Server health check
- `GET /api/stocks` - List all stocks
- `POST /api/stocks` - Add new stock
- `POST /api/predict/:symbol` - Generate prediction
- `GET /api/sort/criteria` - Get sorting options

### Admin Endpoints (Require Authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/stocks/:id` - Delete stock

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8081
DB_HOST=your-production-db-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-strong-jwt-secret
SESSION_SECRET=your-strong-session-secret
```

### Security Considerations
1. Change default admin password
2. Use HTTPS in production
3. Set secure session cookies
4. Implement rate limiting
5. Use environment variables for secrets

## 🎯 Next Steps

1. **Add Historical Data:** Import real stock data for better predictions
2. **Enhance Admin Panel:** Complete user management and settings
3. **Add Charts:** Implement interactive price charts
4. **User Registration:** Add user signup functionality
5. **Mobile App:** Consider React Native implementation

## 📞 Support

If you encounter issues:

1. **Check Prerequisites:** Ensure Node.js and MySQL are properly installed
2. **Review Logs:** Check backend console for error messages
3. **Database Connection:** Verify MySQL is running and accessible
4. **Port Conflicts:** Ensure ports 3000 and 8081 are available
5. **Dependencies:** Run `npm install` in both frontend and backend folders

---

**🎉 Congratulations!** You now have a fully functional stock prediction application with admin panel running locally.

**📚 For detailed documentation, see [README.md](./README.md)**