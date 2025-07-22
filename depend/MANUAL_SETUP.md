# GFX Threshold Dashboard - Manual Setup Guide

## System Requirements
- Node.js v22.17.1 (your current version)
- NPX v10.9.2 (your current version)
- Windows 10/11

## Quick Setup (One Command)

```cmd
SETUP_WINDOWS.bat
```

## Local Development (No Replit Dependencies)

For pure local development without any Replit packages:

```cmd
RUN_LOCAL.bat
```

Or manually:
```cmd
node server-local.js
```

This runs a completely standalone server with no external dependencies.

## Manual Step-by-Step Setup

### Option 1: Full Build (With Vite)
```cmd
npm install
npm run build
START_DASHBOARD.bat
```

### Option 2: Simple Mode (No Vite)
```cmd
npm install
node server-simple.js
```

### 4. Access Dashboard
Open: **http://localhost:5000**

## Windows NODE_ENV Fix

If you see `'NODE_ENV' is not recognized`, use:
- `START_DASHBOARD.bat` (Windows compatible)
- Or `server-simple.js` (bypasses NODE_ENV entirely)

## Dashboard Features ✅

### **Complete UI Implementation**
- **Sidebar**: Data Source Mode toggle (API Download vs Manual Upload)
- **Main Dashboard**: 5 tabs with full functionality
- **Stats Cards**: Real-time data display
- **Threshold Management**: Group-wise and currency-wise modes
- **Trade Consolidation**: File upload and processing
- **Deviation Analysis**: Interactive charts and analysis
- **Alert Drill-down**: Detailed alert management
- **Export & Reports**: Data export capabilities

### **Data Source Modes**
1. **API Download Mode**:
   - Product Type selection (FX Spot, FX Forward, FX Swap)
   - Legal Entity selection (All Entities, GSLB, GSIB)
   - Source System selection (All Systems, SLANG, SUMMIT)
   - Date range picker
   - Connected to UAT/PROD APIs

2. **Manual Upload Mode**:
   - 4-step workflow
   - UAT/PROD trade file uploads
   - Threshold file upload
   - Impact analysis execution

### **Architecture**
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Storage**: Elasticsearch with smart fallback
- **Python API**: Flask server for data processing (optional)

## Optional: Python API Setup

The dashboard can work with or without the Python API server:

### With Python API (Full Features)
```cmd
cd backend
pip install -r requirements.txt
python api_server.py
```

### Without Python API (Basic Mode)
The dashboard works perfectly with just the Node.js server using Elasticsearch or in-memory storage.

## Troubleshooting

### Port 5000 Already in Use
```cmd
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Build Errors
```cmd
rm -rf node_modules package-lock.json
npm install
npm run build:client
```

## Project Structure

```
gfx-threshold-dashboard/
├── SETUP_WINDOWS.bat          # One-click Windows setup
├── client/                    # React frontend
│   ├── src/components/        # UI components
│   └── src/pages/            # Dashboard pages
├── server/                   # Express.js backend
├── backend/                  # Python API (optional)
├── shared/                   # TypeScript schemas
└── package.json             # Dependencies
```

Your dashboard is production-ready and fully functional!