#!/bin/bash

echo "🚀 Blueprint Price Prediction System - 啟動腳本"
echo "=============================================="

# 檢查前置需求
command -v python3 >/dev/null 2>&1 || { echo "❌ 需要 Python 3.10+"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ 需要 Node.js 16+"; exit 1; }
command -v uv >/dev/null 2>&1 || { echo "❌ 需要 uv package manager"; exit 1; }

echo "✅ 前置需求檢查完成"

# 啟動 API 服務 (背景執行)
echo "🔧 啟動 API 服務..."
cd blueprint-price-api
uv pip install -r requirements.txt > /dev/null 2>&1
uv run python api.py &
API_PID=$!
cd ..

# 等待 API 啟動
sleep 5

# 啟動客戶端服務
echo "🌐 啟動客戶端服務..."
cd blueprint-price-client
npm install > /dev/null 2>&1
npm start &
CLIENT_PID=$!
cd ..

echo ""
echo "🎉 服務啟動完成！"
echo "📡 API 服務: http://127.0.0.1:8081"
echo "🌐 客戶端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服務"

# 等待用戶中斷
wait $CLIENT_PID

# 清理進程
echo "🛑 正在停止服務..."
kill $API_PID 2>/dev/null
kill $CLIENT_PID 2>/dev/null

echo "✅ 服務已停止"
