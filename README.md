# 🌍 Country Trivia Web 🗺️

A full-stack, AI-enhanced web application that tests your knowledge of world geography, built with Django, React, and Google Generative AI.

**Live Site**: [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com)

---

## 📜 Table of Contents

- [📖 About The Project](#-about-the-project)
- [✨ Features](#-features)
- [🔧 Tech Stack](#-tech-stack)
- [🧠 Engineering Challenges & System Design](#-engineering-challenges--system-design)
- [🚀 Deployment & Infrastructure](#-deployment--infrastructure)
- [💻 Local Replication](#-local-replication)
- [🎮 How to Play](#-how-to-play)
- [📄 License](#-license)
- [📬 Contact](#-contact)

---

## 📖 About The Project

As an avid traveler and geography enthusiast, I built **Country Trivia Web** as the web-based evolution of my original [Country Trivia CLI project](https://github.com/rajivghandi767/country-trivia-cli). It is designed to challenge users' geography skills by asking them to match countries to their capitals and vice versa.

To elevate the application beyond a simple CRUD app, I integrated **Google's Generative AI (Gemini)**. The AI implementation provides intelligent, context-aware answer grading, dynamically generates fun facts, and creates entirely new multiple-choice quizzes on the fly.

This project demonstrates my self-taught journey into software engineering—highlighting my ability to integrate third-party LLMs into a traditional REST architecture, architect efficient database caching strategies, manage complex frontend state in React, and deploy a robust full-stack application.

---

## ✨ Features

- **Classic Game Modes**: Test knowledge in "Guess the Capital" or "Guess the Country" modes.
- **Dynamic AI Content Generation**: The backend prompts the LLM to generate unique "Did you know?" facts, ensuring no two playthroughs are exactly the same.
- **On-Demand AI Quizzes**: Features dynamically generated, multiple-choice quizzes on diverse topics (e.g., Formula 1, World Football, Caribbean History).
- **State Management & Persistence**: Tracks real-time scoring, provides immediate feedback, and persists high scores in the browser's local storage.

---

## 🔧 Tech Stack

### **Backend**

- 🐍 Python
- 🚀 Django & Django REST Framework
- 🤖 Google Generative AI (Gemini API)

### **Frontend**

- ⚛️ React
- 🔵 TypeScript
- 🍃 Tailwind CSS & Vite

### **Database & Infrastructure**

- 🐘 PostgreSQL & Redis (Isolated Database Network)
- 🐳 Docker & Docker Compose
- 🤖 Jenkins (CI/CD)
- 🔐 HashiCorp Vault (Secrets Management)
- 🌐 Nginx Proxy Manager (Reverse Proxy) & Cloudflare
- 📈 Prometheus, Grafana, & Alertmanager

---

## 🧠 Engineering Challenges & System Design

Building this application required solving several interesting technical challenges, specifically around optimizing AI usage to ensure a snappy user experience while minimizing API costs:

- **Three-Tiered Grading Architecture**: To balance speed, API cost, and accuracy, I engineered a hybrid grading system that escalates in computational complexity only when necessary.
  - _Tier 1 (Normalized Heuristic)_: User input is first evaluated against a normalized set of acceptable answers (handling capitalization and whitespace). This provides instant, zero-cost, $O(1)$ response times for obviously correct answers.
  - _Tier 2 (Fuzzy String Matching)_: If an exact match fails, the system applies an algorithmic fuzzy matching layer (e.g., evaluating Levenshtein distance). This catches minor typos and misspellings locally, entirely bypassing network overhead.
  - _Tier 3 (AI Semantic Fallback)_: If the answer fails the local heuristic and fuzzy checks, it is routed to the Gemini LLM. The AI acts as a semantic judge, parsing edge cases like native language names or partial geographic matches.

- **Data Integrity**: Implementing logic to handle edge cases in geography data (e.g., countries with multiple capitals, recently renamed nations) to ensure the database remains accurately synced with the AI's knowledge base.

### Performance & Scaling

Integrating Large Language Models (LLMs) like Gemini AI into a real-time web application introduces immense latency (5-10s per request) and variable API costs. To achieve a zero-latency user experience, this app implements **Multi-Tiered Heuristics & Materialized Pre-Computation**:

1. **Background Materialization:** The `generate_fun_facts` and `generate_quiz_questions` scripts run asynchronously via Cron/Jenkins. They harvest AI responses during off-peak hours and store them locally, completely decoupling the slow AI generation from the user's web request lifecycle.
2. **Deterministic & Fuzzy Graders:** User answers are first evaluated using `O(1)` lookup maps (cached indefinitely in Redis) and Levenshtein distance algorithms (RapidFuzz), instantly grading 95% of answers without touching the AI.
3. **Memoized LLM Fallback:** When semantic edge cases necessitate an actual AI evaluation, the exact prompt, answer, and result are permanently cached in Redis via an MD5 hash. Identical future guesses bypass the API entirely, capping financial costs and guaranteeing sub-second grading.

---

## 🚀 Deployment & Infrastructure (Production)

This project is continuously deployed to my [Home Lab](https://github.com/rajivghandi767/homelab-iac) environment running on a Raspberry Pi 4B, sitting behind a heavily segmented Ubiquiti network.

- **Zero-Trust Network Routing**: Incoming public traffic is proxied through Cloudflare to a UXG-Fiber Gateway, terminating at Nginx Proxy Manager within a strict Homelab VLAN. This prevents lateral access to other subnets.
- **Automated CI/CD**: Jenkins watches the `main` branch. Upon commit, it runs tests, builds Docker images, and pushes them to a Private GitHub Container Registry. Scheduled deployments run daily at `04:15 AM` EST, followed by an automated data generation pipeline at `04:45 AM` EST. Successful deployments or pipeline failures trigger real-time Discord webhook alerts.
- **Secure Secrets & Data Tiering**: API keys (like the Gemini API key) and database credentials are dynamically injected at runtime via HashiCorp Vault. The PostgreSQL database operates on a completely isolated `database` Docker network, ensuring the data layer is fully abstracted from public ingress.
- **Observability**: Real-time application metrics and container health are continuously scraped by Prometheus and visualized on customized Grafana dashboards.

---

## 💻 Local Replication

This section details how to replicate this environment locally. Everything is fully plug-and-play for local development without the need to manually modify `docker-compose.yml` configurations or supply external API keys.

**Note on Gemini API:** A Gemini API key is **not required** for local development. The local seed data scripts handle populating the database with enough mock/cached data for development and testing purposes.

> ⚠️ **Architecture Note:** To ensure strict parity with the production environment and eliminate local dependency issues, this project is exclusively containerized. Please ensure you have Docker installed before proceeding.

### Prerequisites

- 🐳 Docker & Docker Compose

### Getting Started

Local `docker-compose.yml` and `Dockerfile` configurations are already set to build directly from the source code folder for local development rather than pulling registry images. The `docker-compose.yml` is hardcoded to use `.env.example`, so absolutely no environment configuration is required.

**Spin up the stack:**
```bash
docker compose up -d --build
```
*Note: The database migrations and seed data scripts are automatically executed during container startup! This includes bypassing the need for a live Gemini API key.*

**Accessing Local Services:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

## 🎮 How to Play

1. Navigate to the application in your browser.
2. Select a game mode: "Guess the Capital", "Guess the Country", or generate an "AI Quiz".
3. Submit your answers and let the tiered system evaluate your accuracy.
4. Learn something new from the generated fun facts!

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

**Rajiv Wallace**  
Self-taught Software Engineer based in NYC. Aviation enthusiast, F1 fanatic, and avid traveler transitioning into tech.

- **LinkedIn**: [linkedin.com/in/rajiv-wallace](https://www.linkedin.com/in/rajiv-wallace)
- **GitHub**: [@rajivghandi767](https://github.com/rajivghandi767)
- **Email**: [dev@rajivwallace.com](mailto:dev@rajivwallace.com)
