# 🌍 Country Trivia Web 🗺️

A full-stack, AI-enhanced web application that tests your knowledge of world geography, built with Django and React.

**Live Site**: [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com)

---

## 📜 Table of Contents

- [📖 About The Project](#-about-the-project)
- [✨ Features](#-features)
- [🔧 Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🎮 How to Play](#-how-to-play)
- [🚢 Deployment & Infrastructure](#-deployment--infrastructure)
- [🧠 Data Structures & Algorithms](#-data-structures--algorithms)
- [🛠️ Future Development](#️-future-development)
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
- 🍃 Tailwind CSS
- ⚡ Vite

### **Database**

- 🐘 PostgreSQL

### **DevOps & Infrastructure**

- 🐳 Docker & Docker Compose
- 🤖 Jenkins (CI/CD)
- 🔐 HashiCorp Vault (Secret Management)
- 🌐 Nginx Proxy Manager (Reverse Proxy)
- 📈 Prometheus & Grafana (Monitoring)
- 🥧 Raspberry Pi 4B (Self-Hosting)

---

## 🚀 Getting Started

### Prerequisites

- 🐳 Docker & Docker Compose
- 📝 A `.env` file (see `env.example` for required variables)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/rajivghandi767/country-trivia-web.git
    cd country-trivia-web
    ```

2.  **Create your `.env` file:**

    Create a `.env` file in the root of the project. You will need to populate it with your credentials for:

    - PostgreSQL Database
    - Django (`DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, etc.)
    - Google Generative AI (`GEMINI_API_KEY`)

3.  **Run with Docker Compose:**

    ```bash
    docker compose up -d --build
    ```

    This command will build the images and start the Django backend, React frontend, PostgreSQL database, and Nginx reverse proxy.

---

## 🎮 How to Play

1.  Visit [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com).
2.  **Choose a game mode**: "Guess the Capital", "Guess the Country", or one of the "AI-Generated Quizzes".
3.  **Type your answer** in the input field (for classic modes) or **select an option** (for AI quizzes) and submit.
4.  See your score update, read a fun fact, and proceed to the next question\!

---

## 🚢 Deployment & Infrastructure

This project is fully containerized and deployed within a self-hosted environment on a Raspberry Pi 4B, showcasing a complete CI/CD and monitoring pipeline.

- **Containerization**: **Docker** is used to containerize the Django backend and React frontend, ensuring a consistent and reproducible environment.
- **CI/CD Automation**: **Jenkins** automates the process of building Docker images, running tests (future implementation), and deploying new versions of the application upon code changes.
- **Secret Management**: **HashiCorp Vault** is used to securely store and manage sensitive information such as database credentials and API keys, which are injected into the application at runtime.
- **Monitoring**: **Prometheus** scrapes metrics from the Django application, and **Grafana** provides dashboards for visualizing application performance, request rates, and system health.
- **Reverse Proxy**: **Nginx Proxy Manager** handles incoming traffic, routing requests to the appropriate containers and managing SSL certificates for secure HTTPS connections.

---

## 🧠 Data Structures & Algorithms

This project utilizes fundamental data structures and algorithms:

- **Data Structure: Array**
  - The core trivia data is fetched from the backend as an array of `Country` objects.
  - AI-generated quizzes are fetched as an array of `AIQuestion` objects.
- **Algorithm: Fisher-Yates Shuffle (via `random.shuffle`)**
  - The backend uses a shuffling algorithm on the queryset to randomize the order of questions for each game session, ensuring unpredictability and replayability.

---

## 🛠️ Future Development

This project is actively being developed. Future enhancements include:

- [ ] User authentication and profiles
- [ ] Persistent high-score leaderboards
- [ ] Timed game modes
- [ ] Flag quiz
- [ ] Map integration to show you where the country/city is

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

Rajiv Wallace - [@rajivghandi767](https://github.com/rajivghandi767) - rajivghandi972@gmail.com

Project Link: [https://github.com/rajivghandi767/country-trivia-web](https://github.com/rajivghandi767/country-trivia-web)
