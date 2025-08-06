#!/bin/bash

# StockPredict AI - Setup Script
# This script automates the setup process for the stock prediction app

echo "🚀 Setting up StockPredict AI..."
echo "=================================="

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

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd backend || { print_error "Backend directory not found"; exit 1; }
    
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
        print_status "Creating .env file from template..."
        cp .env.example .env 2>/dev/null || echo "# Add your environment variables here" > .env
        print_warning "Please edit backend/.env with your database credentials"
    fi
    
    cd ..
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd frontend || { print_error "Frontend directory not found"; exit 1; }
    
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

# Setup database
setup_database() {
    print_status "Setting up database..."
    print_warning "Please run the following commands manually in MySQL:"
    echo ""
    echo "  mysql -u root -p"
    echo "  source ./database_schema.sql;"
    echo ""
    print_status "This will create the stock_prediction_db database with all required tables."
}

# Main setup function
main() {
    echo ""
    echo "📈 StockPredict AI Setup"
    echo "========================"
    echo ""
    
    # Check prerequisites
    check_nodejs
    check_mysql
    
    echo ""
    print_status "Installing application dependencies..."
    
    # Setup components
    setup_backend
    setup_frontend
    
    echo ""
    print_status "Setup complete! Next steps:"
    echo ""
    echo "1. Set up the database:"
    echo "   mysql -u root -p"
    echo "   source ./database_schema.sql;"
    echo ""
    echo "2. Configure environment (optional):"
    echo "   edit backend/.env with your database credentials"
    echo ""
    echo "3. Start the application:"
    echo "   Terminal 1: cd backend && npm run dev"
    echo "   Terminal 2: cd frontend && npm start"
    echo ""
    echo "4. Open http://localhost:3000 in your browser"
    echo ""
    
    print_success "Setup completed successfully! 🎉"
    print_status "Visit the README.md for detailed usage instructions."
}

# Run main function
main