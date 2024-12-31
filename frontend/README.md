# **Country Trivia Web App**

## **Overview**

This project is a React/TypeScript web application translated from an existing Python CLI app [Country Trivia CLI](https://github.com/rajivghandi767/country-trivia). The application will be Dockerized and hosted locally on a Raspberry Pi, with continuous integration and deployment (CI/CD) managed through Jenkins.

## **Table of Contents**

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Docker Setup](#docker-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Roadmap](#roadmap)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## **Project Structure**

```bash
.
── 📁country-trivia-react
    └── 📁src
        └── 📁components                # Reusable UI components
            └── Answer.tsx
            └── QuestionPrompt.tsx
            └── StatBar.tsx
        └── App.tsx
        └── data.json
        └── index.css
        └── main.tsx
        └── types.ts
    └── index.html
    └── Jenkinsfile                     # Jenkins pipeline configuration
    └── package.json                    # Dependencies
    └── README.md                       # This file
```

## **Getting Started**

Steps to set up the project locally.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rajivghandi767/country-trivia-react.git
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the development server:**
   ```bash
   npm start
   ```

## **Docker Setup**

1. **Build Docker Image:**
   ```bash
   docker build -t country-trivia-react .
   ```
2. **Run Docker Container:**
   ```bash
   docker run -d -p 5000:5000 --name country-trivia-react country-trivia-react
   ```
3. **Deploy on Raspberry Pi:**
   - Ensure Docker is installed on the Raspberry Pi.
   - Transfer the Docker image or build directly on the Raspberry Pi.
   - Run the container as above.

## **CI/CD Pipeline**

1. **Jenkins Configuration:**

   - Set up Jenkins on your Raspberry Pi or another server.
   - Create a Jenkins pipeline using the configuration in the `Jenkinsfile`.
   - Ensure the pipeline includes steps for building the Docker image, running tests, and deploying the container.

2. **Trigger Pipeline:**
   - The pipeline can be triggered on push to the main branch or through manual triggers in Jenkins.

## **Roadmap**

### **Phase 1: Core CLI Translation**

- [ ] **Command 1 Translation:** Translate core command functionality
- [ ] **Command 2 Translation:** Map command-line arguments to UI forms
- [ ] **Command 3 Translation:** Implement CLI output in the web interface

### **Phase 2: Dockerization & Hosting**

- [ ] **Dockerize Application:** Containerize the React/TypeScript app
- [ ] **Deploy on Raspberry Pi:** Host the Dockerized app locally
- [ ] **Set Up Jenkins Pipeline:** Automate deployment using Jenkins

### **Phase 3: UI/UX Enhancements**

- [ ] **Enhance UI/UX:** Improve user interface and experience
- [ ] **Real-Time Feedback:** Implement real-time command feedback

### **Phase 4: Additional Features**

- [ ] **User Authentication:** Add authentication and profile management
- [ ] **Settings & Configurations:** Implement configuration settings

## **Technologies Used**

The key technologies and libraries used in the project.

- **React.js** - Frontend library
- **TypeScript** - Typed JavaScript
- **Docker** - Containerization platform
- **Jenkins** - CI/CD pipeline automation
- **Raspberry Pi** - Local hosting environment
- **Styled Components** - Tailwind CSS

## **Contributing**

Contributions welcome! Fork the repository, create a branch, and submit a pull request. Ensure that your contributions are well-documented and tested.

## **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
