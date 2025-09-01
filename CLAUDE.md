# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a blueprint price prediction system with two main services:
- **blueprint-price-api**: Flask API service with PyCaret ML model for price predictions (port 8081)
- **blueprint-price-client**: React frontend with AI document scanning capabilities (port 3000)

## Common Development Commands

### Starting Services
```bash
# Start API service
cd blueprint-price-api && uv run python api.py

# Start Client service  
cd blueprint-price-client && npm start
```

### Dependency Management
```bash
# API dependencies (use uv for Python package management)
uv pip install -r requirements.txt

# Client dependencies
npm install
```

### Testing
```bash
# Frontend testing
cd blueprint-price-client && npm test
npx playwright test

# API testing
cd archive/scripts && ./api-test.sh
```

## Architecture

### Service Communication
The React client calls the Flask API at `/predict` endpoint. The API loads a PyCaret regression model from `models/final_model_with_pipeline.pkl` to predict equipment prices based on specifications.

### ML Model Integration
- **Model**: PyCaret regression pipeline with preprocessing
- **Features**: Equipment dimensions, materials, performance parameters
- **Processing**: Identical feature engineering in both frontend and backend
- **Location**: Model file must be accessible at `../models/final_model_with_pipeline` relative to API

### Key Components

**API Service (`blueprint-price-api/api.py`)**:
- Loads PyCaret model at startup
- Processes equipment specifications with feature engineering
- Returns price predictions with input summaries
- Handles CORS for cross-origin requests

**Client Service (`blueprint-price-client/src/`)**:
- `App.js`: Main form interface for equipment specifications
- `components/Scan.js`: AI document scanning using Google Gemini API
- Supports PDF/image processing with pdfjs-dist

### Environment Configuration
- **API**: Uses `ENV` variable for production/development modes
- **Client**: Requires `REACT_APP_GEMINI_API_KEY` for AI scanning features
- **Ports**: API defaults to 8081, configurable via `PORT` environment variable

## Project Structure Notes

- `archive/`: Contains legacy training scripts, data processing tools, and historical models
- `models/`: Active ML model files used by the API
- Model path in API is relative (`../models/`) due to service being in subdirectory

## Troubleshooting

### Model Loading Issues
If you encounter scikit-learn version incompatibility errors, upgrade scikit-learn while maintaining PyCaret compatibility:
```bash
uv pip install --upgrade scikit-learn
```

### Port Conflicts
Both services may fail to start if ports are occupied. Kill existing processes:
```bash
lsof -ti:3000 | xargs kill -9  # Client
lsof -ti:8081 | xargs kill -9  # API  
```
- ## Version Number Guidelines

- When pushing to GitHub, update the README.md version number according to these rules:
  - First digit (x.0.0): Major feature update, significant changes like multi-database support
  - Second digit (0.x.0): General feature additions or bug fixes
  - Third digit (0.0.x): Minor repairs or patches
  - Examples:
    - Major update: 1.5.3 → 2.0.0 (significant changes)
    - Minor update: 2.0.0 → 2.1.0 (new features)
    - Small fix: 2.1.0 → 2.1.1 (minor repairs)
- ## Commit Message Guidelines

- Use the following commit message types to clearly describe the nature of changes:
  - `feat`: For new features (e.g., "feat: add landing page with link to login page")
  - `fix`: For bug fixes
  - `docs`: For documentation changes
  - `style`: For formatting changes that do not affect code meaning (whitespace, formatting, missing semicolons, etc.)
  - `refactor`: For code refactoring
  - `perf`: For performance optimizations
  - `test`: For adding tests
  - `chore`: For updating build tasks or other non-production code changes