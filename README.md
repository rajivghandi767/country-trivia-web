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

**Country Trivia Web** is the web-based evolution of my original [Country Trivia CLI project](https://github.com/rajivghandi767/country-trivia-cli). It is designed to challenge users' geography skills by asking them to match countries to their capitals and vice versa.

To elevate the application beyond a simple CRUD app, I integrated **Google's Generative AI (Gemini)**. The AI implementation provides intelligent, context-aware answer grading, dynamically generates fun facts, and creates entirely new multiple-choice quizzes on the fly.

This project demonstrates my ability to integrate third-party LLMs into a traditional REST architecture, architect efficient database caching strategies, manage complex frontend state in React, and deploy a robust full-stack application.

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

- 🐘 PostgreSQL
- 🐳 Docker & Docker Compose
- 🤖 Jenkins (CI/CD)
- 🔐 HashiCorp Vault (Secrets Management)
- 🌐 Nginx Proxy Manager (Reverse Proxy)

---

## 🧠 Engineering Challenges & System Design

Building this application required solving several interesting technical challenges, specifically around optimizing AI usage to ensure a snappy user experience while minimizing API costs:

- **Three-Tiered Grading Architecture**: To balance speed, API cost, and accuracy, I engineered a hybrid grading system that escalates in computational complexity only when necessary.
  - _Tier 1 (Normalized Heuristic)_: User input is first evaluated against a normalized set of acceptable answers (handling capitalization and whitespace). This provides instant, zero-cost, $O(1)$ response times for obviously correct answers.
  - _Tier 2 (Fuzzy String Matching)_: If an exact match fails, the system applies an algorithmic fuzzy matching layer (e.g., evaluating Levenshtein distance). This catches minor typos and misspellings locally, entirely bypassing network overhead.
  - _Tier 3 (AI Semantic Fallback)_: If the answer fails the local heuristic and fuzzy checks, it is dynamically routed to the Gemini LLM. The AI acts as a semantic judge, parsing edge cases like native language names (e.g., "Deutschland" for Germany) or partial geographic matches (e.g., accepting "Pretoria" for South Africa).
- **API Latency Mitigation & Caching**: Relying solely on live LLM calls introduces unacceptable latency. To engineer around this, I implemented a read-through database caching strategy for the AI-generated trivia facts. The backend queries PostgreSQL first; a live, asynchronous fetch to the Gemini API is only triggered if a fact doesn't already exist. Once fetched, the new fact is stored for future rounds. This drastic reduction in API overhead maintains dynamic generation while guaranteeing speed.
- **Data Integrity**: Implementing logic to handle edge cases in geography data (e.g., countries with multiple capitals, recently renamed nations) to ensure the database remains accurately synced with the AI's knowledge base.

---

## 🚀 Deployment & Infrastructure (Production)

This project is continuously deployed to my [Home Lab](https://github.com/rajivghandi767/homelab-iac) environment running on a Raspberry Pi 4B.

- **Automated CI/CD**: Jenkins watches the `main` branch. Upon commit, it runs tests, builds Docker images, and pushes them to a Private GitHub Container Registry.
- **Secure Secrets**: API keys (like the Gemini API key) and database credentials are never hardcoded. They are injected at runtime via HashiCorp Vault.
- **Routing**: Nginx Proxy Manager handles DNS routing and SSL certificates for the live domain.

---

## 💻 Local Replication

To run this project locally, you will need to adjust the production `docker-compose.yml` to build from source rather than pulling from my private registry.

### 1. Prerequisites

- 🐳 Docker & Docker Compose
- 🔑 A Google Gemini API Key
- 📝 A `.env` file

### 2. Configure Environment (`.env`)

Create a `.env` file based on `env.example`. Make sure to include:

- `POSTGRES_HOST=db`
- `GEMINI_API_KEY=your_api_key_here`
- `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`
- `VITE_API_URL=http://localhost:8000`

### 3. Modify `docker-compose.yml`

- Change the `image` directives to `build` contexts for all custom services (`trivia-backend`, `trivia-frontend`, etc.).
- Remove `external: true` from the network definitions.
- Add a local PostgreSQL container service named `db` (matching your `POSTGRES_HOST` variable).

### 4. Start the Application

```bash
docker compose up -d --build
```

- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8000`

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

**Rajiv Wallace** - [LinkedIn](https://www.linkedin.com/in/rajiv-wallace)

- GitHub: [@rajivghandi767](https://github.com/rajivghandi767)
- Email: rajivghandi972@gmail.com
