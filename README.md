# DevDNA — AI‑Powered GitHub Intelligence Platform

## 🚀 Overview
DevDNA analyzes GitHub profiles using AI to generate:
- **Developer Archetype** (Architect, Hacker, Collaborator, Specialist)
- **Contribution DNA Fingerprint** (visual radar chart)
- **Growth Trajectory** (timeline narrative)
- **AI Gap Analysis** (personalized improvement roadmap)
- **Shareable Dev Card** (exportable summary)

## 🏗️ Architecture
```
devdna/
├── frontend/          # Next.js 14 + Tailwind + Chart.js
├── backend/           # Node.js/Express API
└── ml/                # Python FastAPI microservice
```

## 🧩 Features
### 1. Developer Archetype System
- Classifies developers into 4 personas
- Rule‑based + K‑means clustering hybrid
- LLM‑generated explanations

### 2. Contribution DNA Fingerprint
- Visual radar chart of 5 metrics
- Normalized scoring (0‑100)
- Unique per developer

### 3. Growth Trajectory Engine
- Time‑series analysis of tech adoption
- LLM‑generated narrative
- Shows learning ability

### 4. Dual Mode System
- **Developer Mode**: Deep analytics, code insights
- **Recruiter Mode**: Clean one‑page summary, role fit scores

### 5. AI‑Powered Gap Analysis
- Hyper‑personalized suggestions
- Skills to learn, projects to build
- Open‑source repos to contribute

### 6. Shareable Dev Card
- Export as PNG
- Perfect for LinkedIn/portfolio

## 🚀 Quick Start
### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm start
```

### ML Service
```bash
cd ml
pip install -r requirements.txt
python main.py
```

## 🔧 Environment Variables
Create `.env` files:
- `backend/.env`: `GITHUB_TOKEN=your_token`
- `ml/.env`: `OPENAI_API_KEY=your_key`

## 📡 API Endpoints
- `GET /api/analyze/:username` – Full profile analysis
- `POST /api/ml/archetype` – Predict archetype
- `POST /api/ml/gap-analysis` – Generate gaps

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, React, Tailwind, Chart.js, html2canvas
- **Backend**: Node.js, Express, Axios
- **AI/ML**: Python, FastAPI, scikit‑learn, OpenAI
- **Infra**: Vercel (frontend), Render/AWS (backend)

## 📈 Future Enhancements
- LeetCode/Kaggle integration
- Real‑time collaboration scoring
- Team‑level analytics
- Chrome extension for recruiters

---
Built with ❤️ by DevDNA Team