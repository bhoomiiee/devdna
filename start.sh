#!/bin/bash

echo "🚀 Starting DevDNA Platform..."

# Start backend
cd backend
npm install
npm start &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

# Start ML service (optional)
cd ../ml
pip install -r requirements.txt 2>/dev/null || echo "Python dependencies may need manual install"
python main.py &
ML_PID=$!

echo "✅ Services starting..."
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:4000"
echo "ML Service: http://localhost:5000"

trap "kill $BACKEND_PID $FRONTEND_PID $ML_PID 2>/dev/null; echo '🛑 Services stopped'" EXIT
wait