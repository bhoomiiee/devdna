// Demo data for presentation — realistic mock profiles
const DEMO_PROFILES = {
  default: {
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    name: "Demo Developer",
    bio: "Full-stack developer passionate about open source and clean code.",
    location: "San Francisco, CA",
    public_repos: 47,
    followers: 312,
    following: 89,
    streak_days: 23,
    top_skills: ["JavaScript", "TypeScript", "Python", "React", "Node.js"],
    archetype: {
      type: "The Architect",
      emoji: "🏗️",
      description: "This developer demonstrates a strong preference for building scalable, well-structured systems. Their repositories show consistent use of design patterns and modular architecture. They prioritize code quality and long-term maintainability over rapid delivery.",
    },
    dna_scores: {
      commit_consistency: 78,
      language_diversity: 72,
      project_complexity: 65,
      documentation_quality: 58,
      collaboration_score: 45,
    },
    growth_narrative: "Starting with JavaScript fundamentals in 2020, this developer rapidly expanded into TypeScript and React, building increasingly complex frontend applications. By 2022, they adopted Node.js and began building full-stack systems. Their 2023-2024 work shows a clear shift toward scalable architecture with Docker and cloud deployments, indicating strong growth from junior to mid-senior level.",
    milestones: [
      { year: 2020, tech: "JavaScript", repos: 8, description: "Started with JavaScript, built 8 repos including portfolio and small tools · 12 stars earned" },
      { year: 2021, tech: "React", repos: 11, description: "Adopted React and TypeScript, built 11 repos including e-commerce and dashboards · 45 stars earned" },
      { year: 2022, tech: "Node.js", repos: 9, description: "Expanded to full-stack with Node.js and Express, built 9 repos · 78 stars earned" },
      { year: 2023, tech: "Python", repos: 12, description: "Added Python to the stack, explored ML and automation · 134 stars earned" },
      { year: 2024, tech: "TypeScript", repos: 7, description: "Focused on TypeScript and system design, built 7 production-grade repos · 89 stars earned" },
    ],
    gap_analysis: [
      {
        skill: "System Design",
        suggestion: "Build a distributed URL shortener with Redis caching, load balancing, and a rate limiter to practice real-world system design.",
        resources: ["Designing Data-Intensive Applications by Martin Kleppmann", "systemdesign.one"],
      },
      {
        skill: "Testing & TDD",
        suggestion: "Add 80%+ test coverage to your top 3 repos using Jest and React Testing Library. Practice writing tests before code.",
        resources: ["Testing JavaScript by Kent C. Dodds", "jestjs.io/docs/getting-started"],
      },
      {
        skill: "DevOps & CI/CD",
        suggestion: "Set up a full CI/CD pipeline with GitHub Actions, Docker, and deploy to a cloud provider for one of your existing projects.",
        resources: ["GitHub Actions documentation", "The DevOps Handbook"],
      },
    ],
    role_fit: { frontend: 82, backend: 68, devops: 34, ai_ml: 45 },
    recruiter_summary: "A highly capable full-stack developer with strong frontend expertise and growing backend skills. Their consistent commit history and diverse project portfolio demonstrate reliability and breadth. Best suited for frontend-heavy or full-stack roles at product companies.",
    project_detection: {
      summary: "6 out of 12 projects show production-level complexity",
      production_score: 68,
      real_projects: [
        { name: "ecommerce-platform", reason: "Full authentication, payment integration, admin dashboard", complexity: "high" },
        { name: "devdna", reason: "AI integration, multiple APIs, complex data pipeline", complexity: "high" },
        { name: "task-manager-api", reason: "RESTful API with auth, database, and tests", complexity: "medium" },
        { name: "portfolio-v2", reason: "Custom design, animations, deployed to production", complexity: "medium" },
      ],
      tutorial_projects: [
        { name: "todo-app-react", reason: "Classic tutorial project, minimal complexity" },
        { name: "weather-app", reason: "Common beginner project using public API" },
      ],
    },
    interview_readiness: {
      overall_score: 72,
      categories: {
        projects: { score: 80, note: "Strong portfolio with real-world projects" },
        code_quality: { score: 70, note: "Good structure, could improve test coverage" },
        consistency: { score: 78, note: "Regular commits, active in last 6 months" },
        collaboration: { score: 55, note: "Mostly solo projects, few PRs to other repos" },
        documentation: { score: 60, note: "Some READMEs missing, wikis underutilized" },
      },
      verdict: "Well-prepared for mid-level roles. Strong project portfolio compensates for limited open-source collaboration.",
      top_tip: "Add tests to your top 2 projects and contribute a PR to a popular open-source repo — this will significantly boost your interview performance.",
    },
    opportunities: [
      { repo: "facebook/react", why: "Matches your React expertise — documentation and bug fixes welcome", issue_type: "good first issue", skill_gained: "Deep React internals knowledge", url: "https://github.com/facebook/react" },
      { repo: "vercel/next.js", why: "You use Next.js — contributing back builds credibility", issue_type: "documentation", skill_gained: "Next.js internals and SSR patterns", url: "https://github.com/vercel/next.js" },
      { repo: "microsoft/TypeScript", why: "Strong TypeScript skills make you a good contributor", issue_type: "good first issue", skill_gained: "Compiler internals and type system depth", url: "https://github.com/microsoft/TypeScript" },
      { repo: "expressjs/express", why: "Node.js/Express is your backend stack", issue_type: "documentation", skill_gained: "Middleware patterns and HTTP internals", url: "https://github.com/expressjs/express" },
      { repo: "axios/axios", why: "You use axios heavily — contribute to what you use daily", issue_type: "good first issue", skill_gained: "HTTP client internals and interceptors", url: "https://github.com/axios/axios" },
    ],
    commit_events: (() => {
      const events = [];
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        if (Math.random() > 0.45) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          events.push({ date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 8) + 1 });
        }
      }
      return events;
    })(),
    repos: [
      { name: "ecommerce-platform", language: "TypeScript", stars: 89, forks: 23, description: "Full-stack e-commerce with Next.js, Stripe, and PostgreSQL", url: "https://github.com" },
      { name: "devdna", language: "TypeScript", stars: 45, forks: 12, description: "AI-powered GitHub intelligence platform", url: "https://github.com" },
      { name: "task-manager-api", language: "Node.js", stars: 34, forks: 8, description: "RESTful task management API with JWT auth", url: "https://github.com" },
      { name: "ml-sentiment-analyzer", language: "Python", stars: 67, forks: 19, description: "Sentiment analysis using transformers and FastAPI", url: "https://github.com" },
      { name: "react-component-library", language: "TypeScript", stars: 112, forks: 31, description: "Accessible React component library with Storybook", url: "https://github.com" },
      { name: "portfolio-v2", language: "JavaScript", stars: 28, forks: 5, description: "Personal portfolio with animations and dark mode", url: "https://github.com" },
    ],
  },
};

function getDemoProfile(username) {
  // Return demo data with the actual username injected
  const profile = JSON.parse(JSON.stringify(DEMO_PROFILES.default));
  profile.name = username.charAt(0).toUpperCase() + username.slice(1);
  profile.avatar_url = `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000)}?v=4`;
  return profile;
}

module.exports = { getDemoProfile };
