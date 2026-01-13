# 🌍 Country Trivia Web 🗺️

A full-stack, AI-enhanced web application that tests your knowledge of world geography, built with Django and React.

**Live Site**: [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com)

---

## 📜 Table of Contents

- [📖 About The Project](#-about-the-project)
- [✨ Features](#-features)
- [🔧 Tech Stack](#-tech-stack)
- [🚀 Deployment & Infrastructure](#-deployment--infrastructure)
- [💻 Local Replication](#-local-replication)
- [🎮 How to Play](#-how-to-play)
- [🧠 Data Structures & Algorithms](#-data-structures--algorithms)
- [📄 License](#-license)
- [📬 Contact](#-contact)

---

## 📖 About The Project

**Country Trivia Web** is the web-based evolution of the original [Country Trivia CLI project](https://github.com/rajivghandi767/country-trivia-cli). It's an engaging game designed to challenge your geography skills by asking you to guess the capital of a given country or vice versa.

This project has been expanded to leverage **Google's Generative AI (Gemini)** to create a more dynamic and intelligent user experience. The AI provides lenient, context-aware answer grading, generates unique fun facts for each question, and even creates entire quizzes on new topics from scratch.

This project serves as a practical application for strengthening full-stack development skills, from database management and third-party AI integration to frontend state management and DevOps.

---

## ✨ Features

- **Two Classic Game Modes**: Guess the capital city or guess the country.
- **AI-Powered Grading**: Utilizes Google Generative AI to intelligently grade answers, correctly identifying misspellings, abbreviations, and partial answers (e.g., "Pretoria" for South Africa).
- **AI-Generated Fun Facts**: Provides a unique, AI-generated "Did you know?" fact after each question is answered.
- **Dynamic AI Quizzes**: Features AI-generated, multiple-choice quizzes on various topics, including Formula 1, World Football, and Caribbean History.
- **Immediate Feedback**: Instantly know if your answer was correct, incorrect, or partially correct.
- **Score Tracking**: Keep track of your score as you progress through the questions.
- **High Score Persistence**: Saves your high score for classic modes in the browser's local storage.
- **Randomized Questions**: The backend shuffles the country list for each new game session.

---

## 🔧 Tech Stack

### **Backend**

- 🐍 Python
- 🚀 Django & Django REST Framework
- 🤖 Google Generative AI (Gemini)

### **Frontend**

- ⚛️ React
- 🔵 TypeScript
- 🍃 Tailwind CSS & Vite

### **Database**

- 🐘 PostgreSQL (Self-hosted on Raspberry Pi in Production)

### **DevOps & Infrastructure**

- 🐳 Docker & Docker Compose
- 🤖 Jenkins (CI/CD)
- 🔐 HashiCorp Vault (Secret Management)
- 🌐 Nginx Proxy Manager (Reverse Proxy)
- 📈 Prometheus & Grafana (Monitoring)
- 🥧 Raspberry Pi 4B (Self-Hosting)

---

## 📂 Project Structure

```
.
├── 📁 backend/
│   ├── ⚙️ config/
│   ├── 🌍 trivia/
│   ├── 🐳 Dockerfile.prod
│   ├── 📄 requirements.txt
│   └── 🚀 manage.py
├── 📁 frontend/
│   ├── 📁 src/
│   └── 🐳 Dockerfile.prod
├── 📁 nginx/
│   └── 🐳 Dockerfile
├── 🐳 docker-compose.yml
├── 📄 env.example
├── 🤖 Jenkinsfile
├── 🤖 Jenkinsfile.deploy
└── 📄 README.md
```

---

## 🚀 Deployment & Infrastructure (Production)

This project is deployed in a specific [Home Lab](https://github.com/rajivghandi767/homelab-iac) environment. Below is the documentation of the production architecture.

### Infrastructure

- **Host**: 🥧 Raspberry Pi 4B running a headless Debian distro (DietPi).
- **Containerization**: 🐳 Docker and Docker Compose manage the services.
- **Reverse Proxy**: 🌐 Nginx Proxy Manager handles routing and SSL.
- **Registry**: Images are built and pushed to a **Private GitHub Container Registry**.
- **Database**: Connects to an external self-hosted PostgreSQL instance.

### CI/CD Pipeline

**Jenkins** watches the `main` branch. On commit:

1.  Tests are run.
2.  Docker images are built and pushed to the private registry.
3.  The production environment pulls the new images and updates the containers once daily.
4.  Secrets are injected dynamically via **HashiCorp Vault** during build and deploy stages.
5.  Success or Failure reports are sent to Discord.

---

## 💻 Local Replication

This section details how to replicate this environment locally. Since the `docker-compose.yml` is configured for my specific production environment (private registry, external networks), you will need to make the following adjustments to run it on your machine.

### 1. Prerequisites

- 🐳 Docker & Docker Compose
- 🔑 An API key of any LLM of your choosing
- 📝 A `.env` file (see `env.example`)

### 2. Configure Environment (`.env`)

Create a `.env` file based on the example.

**Key Variable Adjustments (\*):**

- `POSTGRES_HOST`: _Set this to `db` (matching the service name added in Step 4)._
- `GEMINI_API_KEY`: _Required for AI grading and quiz generation._
- `DJANGO_ALLOWED_HOSTS`: _Add `localhost,127.0.0.1`._
- `VITE_API_URL`: _Set to `http://localhost:8000`._

### 3. Modify `docker-compose.yml` for Local Build (\*)

My production file pulls images from a **Private Registry**. To run this locally, you must switch **ALL** services to build from source and remove external network requirements.

**A. Switch from Image to Build:**
_Update `trivia-backend`, `trivia-backend-init`, `trivia-frontend`, and `trivia-nginx` to use `build` contexts instead of `image`._

```yaml
# In docker-compose.yml (Example Modifications):

trivia-backend-init:
  # image: ghcr.io/...  <-- COMMENT OUT
  build:
    context: ./backend
    dockerfile: Dockerfile.prod

trivia-backend:
  # image: ghcr.io/...  <-- COMMENT OUT
  build:
    context: ./backend
    dockerfile: Dockerfile.prod

trivia-frontend:
  # image: ghcr.io/...  <-- COMMENT OUT
  build:
    context: ./frontend
    dockerfile: Dockerfile.prod

trivia-nginx:
  # image: ghcr.io/...  <-- COMMENT OUT
  build:
    context: ./nginx
    dockerfile: Dockerfile
```

**B. Update Networks:**
_Remove `external: true` from the network definitions at the bottom of the file so Docker creates them automatically._

```yaml
networks:
  trivia:
    # external: true  <-- COMMENT OUT
  core:
    # external: true  <-- COMMENT OUT
```

### 4. Database Setup (\*)

Since the production setup connects to an external DB, you must provide one locally. Add this service to your `docker-compose.yml` so the `init` container can reach it:

```yaml
db:
  image: postgres:15-alpine
  container_name: trivia-db
  environment:
    - POSTGRES_DB=postgres-core
    - POSTGRES_USER=trivia-prod
    - POSTGRES_PASSWORD=your-secure-postgres-password
  networks:
    - database
```

_Ensure your `.env` file matches these credentials and sets `POSTGRES_HOST=db`._

### 5. Start the Application

Once the adjustments are made:

```bash
docker compose up -d --build
```

- **Frontend**: `http://localhost:5173` (Requires port mapping `5173:80` on the frontend service if not using Nginx)
- **Backend**: `http://localhost:8000`

---

## 🎮 How to Play

1.  Visit **localhost** (or the live site).
2.  **Choose a game mode**: "Guess the Capital", "Guess the Country", or one of the "AI-Generated Quizzes".
3.  **Type your answer** in the input field (for classic modes) or **select an option** (for AI quizzes) and submit.
4.  See your score update, read a fun fact, and proceed to the next question!

---

## 🧠 Data Structures & Algorithms

This project utilizes fundamental data structures and algorithms:

- **Data Structure: Array**
  - The core trivia data is fetched from the backend as an array of `Country` objects.
  - AI-generated quizzes are fetched as an array of `AIQuestion` objects.
- **Algorithm: Fisher-Yates Shuffle (via `random.shuffle`)**
  - The backend uses a shuffling algorithm on the queryset to randomize the order of questions for each game session, ensuring unpredictability and replayability.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

Rajiv Wallace - [@rajivghandi767](https://github.com/rajivghandi767) - rajivghandi972@gmail.com

Project Link: [https://github.com/rajivghandi767/country-trivia-web](https://github.com/rajivghandi767/country-trivia-web)
