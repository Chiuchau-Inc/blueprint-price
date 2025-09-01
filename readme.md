# Blueprint Price Prediction System - Essential Distribution

這是機殼風扇價格預測系統的精簡版本，包含運行專案所需的核心文件。

## 🚀 快速啟動

### 前置需求
- Python 3.10+
- Node.js 16+
- uv (Python package manager)

### 1. 啟動 API 服務 (Flask)
```bash
cd blueprint-price-api
uv pip install -r requirements.txt
uv run python api.py
```
API 將運行在 `http://127.0.0.1:8081`

### 2. 啟動客戶端服務 (React)
```bash
cd blueprint-price-client
npm install
npm start
```
客戶端將運行在 `http://localhost:3000`

## 📁 專案結構

```
blueprint-price-essential/
├── blueprint-price-api/           # Flask API 服務
│   ├── api.py                     # 主要 API 文件
│   ├── requirements.txt           # Python 依賴
│   └── runtime.txt               # Python 版本設定
├── blueprint-price-client/        # React 前端應用
│   ├── src/
│   │   ├── components/           # React 組件
│   │   │   ├── Scan.js          # AI 文件掃描組件
│   │   │   ├── ResultsTable.js   # 結果顯示表格
│   │   │   └── SmartDimensionInput.js # 智能尺寸輸入組件
│   │   ├── App.js               # 主要應用組件
│   │   ├── App.css              # 應用樣式
│   │   ├── index.js             # React 入口點
│   │   └── index.css            # 全局樣式
│   ├── public/
│   │   ├── index.html           # HTML 模板
│   │   └── robots.txt           # 搜索引擎設定
│   └── package.json             # Node.js 依賴
├── models/
│   └── final_model_with_pipeline.pkl  # 機器學習模型
├── CLAUDE.md                    # Claude Code 使用指南
├── .env.example                 # 環境變數範例
└── .gitignore                   # Git 忽略設定
```

## ⚙️ 環境變數設定

複製 `.env.example` 為 `.env` 並設定必要變數：

```bash
cp .env.example .env
```

編輯 `.env` 文件：
```
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🔧 功能特色

1. **價格預測**: 基於 PyCaret 機器學習模型的設備價格預測
2. **AI 文件掃描**: 使用 Google Gemini API 自動解析 CAD 圖面
3. **智能輸入**: 響應式表單界面，支援滑動輸入和數值驗證
4. **結果管理**: 查詢歷史記錄和結果比較功能

## 📋 依賴說明

### API 服務依賴 (Python)
- Flask: Web 框架
- PyCaret: 機器學習平台
- pandas: 數據處理
- scikit-learn: 機器學習庫
- flask-cors: 跨域請求支援

### 客戶端依賴 (JavaScript)
- React: 前端框架
- axios: HTTP 客戶端
- Bootstrap: UI 組件庫
- @google/generative-ai: Google Gemini AI 整合
- pdfjs-dist: PDF 文件處理

## 🚨 故障排除

### 常見問題

1. **端口已被佔用**
   ```bash
   # 查找並終止佔用端口的進程
   lsof -ti:8081 | xargs kill -9  # API 端口
   lsof -ti:3000 | xargs kill -9  # 客戶端端口
   ```

2. **模型載入失敗**
   - 確認 `models/final_model_with_pipeline.pkl` 文件存在
   - 檢查 scikit-learn 版本兼容性

3. **AI 掃描功能無效**
   - 確認已設定 `REACT_APP_GEMINI_API_KEY`
   - 檢查 API 金鑰權限和額度

## 📝 版本資訊

- 版本: 1.0.0
- 最後更新: 2025-09-01
- Python: 3.10+
- Node.js: 16+

## 🔗 相關連結

- [Claude Code 文檔](https://docs.anthropic.com/claude/docs)
- [PyCaret 官方文檔](https://pycaret.org/)
- [React 官方文檔](https://react.dev/)

## 📜 授權

Copyright © 2025 Chiuchau Inc. All rights reserved.
