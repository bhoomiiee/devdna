# DevDNA — System Architecture

## Overview

DevDNA is an AI-powered GitHub intelligence platform that analyzes developer profiles using real GitHub data and LLM-based analysis. It follows a microservices architecture deployed on Kubernetes with GitOps via Argo CD.

---

## System Components

### 1. Frontend (Next.js 14)
- Server-side rendered React application
- Tailwind CSS for styling
- Chart.js for DNA fingerprint radar charts
- Real-time task updates via Server-Sent Events (SSE)
- Deployed on Vercel (CDN edge network)

### 2. Backend API (Node.js / Express)
- RESTful API + SSE endpoints
- JWT authentication with bcrypt password hashing
- Redis-backed caching (5-minute TTL per profile)
- In-memory task queue with worker processing
- Rate limiting via express-rate-limit
- Security headers via Helmet.js
- Structured logging via Winston

### 3. ML Service (Python / FastAPI)
- K-means clustering for developer archetype classification
- Feature extraction from GitHub metadata
- Placeholder for OpenAI embeddings-based skill matching

### 4. Redis
- Profile analysis cache (reduces GitHub API calls)
- Task queue storage
- Session management

### 5. Nginx (Reverse Proxy)
- SSL termination
- Rate limiting (10 req/s per IP)
- Routes `/api/*` to backend, `/` to frontend

---

## AI Pipeline

```
GitHub API → Raw Data → Feature Engineering → Groq LLM → Structured JSON
                                                    ↓
                                            Gemini (fallback)
                                                    ↓
                                            Demo Mode (fallback)
```

### Single Master Prompt Strategy
All AI analysis (archetype, growth narrative, gap analysis, project detection, interview readiness, opportunities) is done in **one Groq API call** to minimize rate limit usage and latency.

---

## Task Queue Architecture

```
User Request → POST /api/tasks → Task Created (pending)
                                        ↓
                              In-Memory Queue (Redis in prod)
                                        ↓
                              Worker picks up task
                                        ↓
                              Status: running → success/failed
                                        ↓
                              SSE stream → Frontend updates in real-time
```

### Task Operations
1. `analyze` — Full GitHub profile analysis
2. `roast` — AI-generated developer roast
3. `gap_analysis` — Skill gap identification
4. `interview_readiness` — Interview preparation score
5. `compare` — Head-to-head developer comparison

---

## Authentication Flow

```
Register: email + password → bcrypt hash → stored in memory/DB
Login: email + password → bcrypt compare → JWT signed (7d expiry)
Request: JWT in Authorization header → middleware verifies → req.user set
```

---

## Kubernetes Architecture

```
                    Internet
                        │
                   Ingress (Nginx)
                   /            \
            frontend:3000    backend:4000
                                  │
                             redis:6379
```

### Horizontal Pod Autoscaler (HPA)
- Backend: 2-10 replicas, scales at 70% CPU
- Frontend: 2-5 replicas, scales at 70% CPU
- Worker: 1-5 replicas, scales based on queue depth

### Why HPA?
When many users analyze profiles simultaneously, the backend CPU spikes due to GitHub API calls and AI processing. HPA automatically adds pods to handle load and removes them when traffic drops, optimizing cost.

---

## GitOps with Argo CD

```
Developer pushes code
        ↓
GitHub Actions: lint → build Docker → push to GHCR/Docker Hub
        ↓
Update K8s manifests with new image tag
        ↓
Argo CD detects manifest change
        ↓
Argo CD syncs cluster to desired state
        ↓
Rolling deployment (zero downtime)
```

---

## Cloud Infrastructure

| Component | Service | Reason |
|-----------|---------|--------|
| Frontend | Vercel | Next.js native, global CDN, free tier |
| Backend | Railway / Render | Node.js hosting, auto-deploy |
| Redis | Upstash | Serverless Redis, free tier, global |
| Container Registry | GHCR + Docker Hub | Free, CI/CD integrated |
| K8s | Any cloud (EKS/GKE/AKS) | Production deployment |

---

## Security

- JWT tokens (7-day expiry, HS256)
- bcrypt password hashing (10 rounds)
- Helmet.js security headers
- Rate limiting: 100 req/15min (API), 10 req/15min (auth)
- CORS restricted to known origins
- `.env` never committed (gitignored)
- Secrets managed via K8s Secrets / Sealed Secrets

---

## Data Flow

```
1. User enters GitHub username
2. Frontend → GET /api/analyze/:username
3. Backend checks Redis cache
4. If miss: fetch GitHub API (user + repos + events)
5. Compute DNA scores, role fit, milestones locally
6. Single Groq API call for AI analysis
7. Cache result in Redis (5 min TTL)
8. Return JSON to frontend
9. Frontend renders charts, cards, tabs
```

---

## Monitoring

- `/health` endpoint — uptime, memory, cache size, AI provider status
- `/metrics` endpoint — request counts, response times
- Winston structured logging → log files + console
- Railway/Render built-in metrics dashboard
