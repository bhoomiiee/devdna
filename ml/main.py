from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from sklearn.cluster import KMeans
import requests
import os
from typing import List, Dict, Any

app = FastAPI(title="DevDNA ML Service")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

class GitHubProfile(BaseModel):
    username: str
    repos: List[Dict[str, Any]]

class ArchetypeRequest(BaseModel):
    features: List[float]

def fetch_github_data(username: str):
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    user_res = requests.get(f"https://api.github.com/users/{username}", headers=headers)
    repos_res = requests.get(f"https://api.github.com/users/{username}/repos?per_page=100", headers=headers)
    return user_res.json(), repos_res.json()

def extract_features(repos: List[Dict]) -> List[float]:
    if not repos:
        return [0.0] * 5
    commit_count = sum(r.get("size", 0) for r in repos) / 1000
    languages = len(set(r.get("language") for r in repos if r.get("language")))
    forks = sum(r.get("forks_count", 0) for r in repos)
    stars = sum(r.get("stargazers_count", 0) for r in repos)
    age_days = sum((2025 - int(r.get("created_at", "2025")[:4])) for r in repos)
    return [commit_count, languages, forks, stars, age_days]

@app.post("/api/ml/archetype")
async def predict_archetype(req: ArchetypeRequest):
    features = np.array(req.features).reshape(1, -1)
    kmeans = KMeans(n_clusters=4, random_state=42)
    kmeans.fit(np.random.rand(100, 5))  # dummy training
    cluster = kmeans.predict(features)[0]
    archetypes = [
        {"type": "The Architect", "emoji": "🏗️", "description": "Builds scalable systems"},
        {"type": "The Hacker", "emoji": "⚡", "description": "Rapid prototyping"},
        {"type": "The Collaborator", "emoji": "🤝", "description": "Team‑focused"},
        {"type": "The Specialist", "emoji": "🔬", "description": "Deep domain expert"},
    ]
    return archetypes[cluster]

@app.post("/api/ml/gap-analysis")
async def gap_analysis(profile: GitHubProfile):
    # Placeholder: real implementation would use embeddings + LLM
    return {
        "gaps": [
            {
                "skill": "System Design",
                "suggestion": "Build a microservices project with Docker",
                "resources": ["Designing Data‑Intensive Applications"],
            }
        ]
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
