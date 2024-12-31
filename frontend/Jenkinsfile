pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = "docker-compose.prod.yaml"
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "Checking out repository"
                checkout scm
            }
        }

        stage('Lint Code') {
            steps {
                echo "Linting Frontend and Backend"
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run lint'
                }
            }
        }

        stage('Run Tests') {
            steps {
                echo "Running Tests"
                dir('frontend') {
                    sh 'npm run test'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Image"
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} build"
            }
        }

        stage('Deploy Locally') {
            steps {
                echo "Deploying Services Locally"
                sh """
                    docker compose -f ${DOCKER_COMPOSE_FILE} down
                    docker compose -f ${DOCKER_COMPOSE_FILE} up -d
                """
            }
        }

        stage('Clean Up Unused Docker Resources') {
            steps {
                echo "Cleaning up unused Docker resources"
                sh """
                    docker system prune -f --volumes
                    docker network prune -f
                """
            }
        }

        stage('Smoke Test') {
            steps {
                echo "Running Smoke Tests for Country Trivia Web App"

                echo "Testing Country Trivia App"
                sh "curl -f https://countrytrivia.rajivwallace.com || exit 1"
            }
        }
    }

    post {
        success {
            echo "Deployment completed successfully!"
        }
        failure {
            echo "Deployment failed. Check the logs for more information."
        }
    }
}