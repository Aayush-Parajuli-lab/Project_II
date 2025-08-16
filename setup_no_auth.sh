#!/bin/bash

# StockVision Pro - Information Sharing Platform Setup Script
# This script automates the setup process for the stock information sharing platform

echo "🚀 Setting up StockVision Pro Information Sharing Platform..."
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
}

# Check if MySQL is installed
check_mysql() {
    print_status "Checking MySQL installation..."
    if command -v mysql &> /dev/null; then
        print_success "MySQL found"
    else
        print_warning "MySQL not found. Please install MySQL 8.0+ manually."
        print_status "Installation commands:"
        echo "  Ubuntu/Debian: sudo apt install mysql-server"
        echo "  macOS: brew install mysql"
        echo "  Windows: Download from https://dev.mysql.com/downloads/"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    if command -v mysql &> /dev/null; then
        print_status "Running database migration..."
        mysql -u root -p < migrate_to_no_auth.sql
        
        if [ $? -eq 0 ]; then
            print_success "Database migration completed"
        else
            print_warning "Database migration failed. You may need to run it manually."
        fi
    else
        print_warning "MySQL not available. Please run the migration script manually:"
        echo "  mysql -u root -p < migrate_to_no_auth.sql"
    fi
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd backend || { print_error "Backend directory not found"; exit 1; }
    
    # Backup original server.js
    if [ -f server.js ]; then
        print_status "Backing up original server.js..."
        cp server.js server.js.backup
        print_success "Original server.js backed up"
    fi
    
    # Copy new no-auth server
    if [ -f ../backend_server_no_auth.js ]; then
        print_status "Installing new no-auth server..."
        cp ../backend_server_no_auth.js server.js
        print_success "New server installed"
    else
        print_warning "No-auth server file not found. Please copy it manually."
    fi
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# StockVision Pro - Information Sharing Platform Configuration
PORT=8081
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stock_prediction_db
DB_PORT=3306

# JWT Secret for admin authentication
JWT_SECRET=your-secure-jwt-secret-key

# Session Secret
SESSION_SECRET=your-secure-session-secret

# External APIs (optional)
NINJA_API_KEY=your_ninja_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Platform Mode
NO_EXTERNAL_APIS=false
STATIC_MODE=false
EOF
        print_warning "Please edit backend/.env with your database credentials"
    fi
    
    cd ..
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd frontend || { print_error "Frontend directory not found"; exit 1; }
    
    # Backup original App.js
    if [ -f src/App.js ]; then
        print_status "Backing up original App.js..."
        cp src/App.js src/App.js.backup
        print_success "Original App.js backed up"
    fi
    
    # Copy new no-auth App.js
    if [ -f ../frontend/src/App_no_auth.js ]; then
        print_status "Installing new no-auth App.js..."
        cp ../frontend/src/App_no_auth.js src/App.js
        print_success "New App.js installed"
    else
        print_warning "No-auth App.js file not found. Please copy it manually."
    fi
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    cd ..
}

# Main setup function
main() {
    print_status "Starting setup process..."
    
    check_nodejs
    check_mysql
    setup_database
    setup_backend
    setup_frontend
    
    print_success "Setup completed successfully!"
    echo ""
    echo "🎉 StockVision Pro Information Sharing Platform is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit backend/.env with your database credentials"
    echo "2. Start the backend: cd backend && npm run dev"
    echo "3. Start the frontend: cd frontend && npm start"
    echo "4. Access the platform at http://localhost:3000"
    echo "5. Admin login: admin / admin123"
    echo ""
    echo "🔐 All stock data is now publicly accessible!"
    echo "⚙️ Admin panel available for system management"
}

# Run main function
main