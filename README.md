# 🌍 Country Trivia Web 🗺️

A full-stack web application that tests your knowledge of world capitals, built with Django and React.

**Live Site**: [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com)

---

## 📜 Table of Contents

- [About The Project](#-about-the-project)
- [✨ Features](#-features)
- [🚀 Getting Started](#-getting-started)
- [🎮 How to Play](#-how-to-play)
- [🚢 Deployment & Infrastructure](#-deployment--infrastructure)
- [🧠 Data Structures & Algorithms](#-data-structures--algorithms)
- [🛠️ Future Development](#️-future-development)
- [📄 License](#-license)
- [📬 Contact](#-contact)

---

## 📖 About The Project

**Country Trivia Web** is the web-based evolution of the original [Country Trivia CLI project](https://github.com/rajivghandi767/country-trivia-cli). It's a simple and engaging game designed to challenge your geography skills by asking you to guess the capital of a given country or vice versa.

This project serves as a practical application for strengthening full-stack development skills, from database management and API design to frontend state management and user interaction.

**Tech Stack:**

- **Backend**: Python, Django REST Framework, PostgreSQL
- **Frontend**: TypeScript, React
- **DevOps**: Docker

---

## ✨ Features

- **Two Game Modes**: Guess the capital city or guess the country.
- **Randomized Questions**: Questions are shuffled on each playthrough for a fresh experience.
- **Immediate Feedback**: Instantly know if your answer was correct.
- **Score Tracking**: Keep track of your score as you progress through the questions.
- **Clean & Simple UI**: An intuitive and easy-to-use interface.

---

## 🚀 Getting Started

_(Instructions to be added)_

---

## 🎮 How to Play

1.  Visit [**trivia.rajivwallace.com**](https://trivia.rajivwallace.com).
2.  **Choose a game mode**: "Guess the Capital" or "Guess the Country".
3.  **Type your answer** in the input field and press `Enter` or click "Submit".
4.  See your score update and proceed to the next question!

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
- [ ] Flag quiz

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

Rajiv Wallace - [@rajivghandi767](https://github.com/rajivghandi767) - rajivghandi972@gmail.com

Project Link: [https://github.com/rajivghandi767/country-trivia-web](https://github.com/rajivghandi767/country-trivia-web)
