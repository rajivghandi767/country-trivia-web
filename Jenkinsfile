pipeline {
    agent any

    environment {

        ENV = 'prod'
        DOCKER_BACKEND = 'country-trivia-backend'
        DOCKER_FRONTEND = 'country-trivia-frontend'
        DOCKER_COMPOSE_FILE = "docker-compose.prod.yml"
        
        DB_HOST = 'https://db.rajivwallace.com'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "Checking out repository"
                dir('/opt') {
                    checkout scm
                    }
            }
        }

        stage('Infrastructure Check') {
            steps {
                echo "Checking if Vault and PostgreSQL are accessible"
                script {
                    sh '''
                        curl -s ${VAULT_ADDR}/v1/sys/health || {
                            echo "Vault is not accessible"
                            exit 1
                        }
                    '''
                    
                    sh '''
                        nc -zv ${DEPLOY_HOST} 5432 || {
                            echo "PostgreSQL is not accessible"
                            exit 1
                        }
                    '''
                }
            }
        }

        stage('Get Secrets') {
            steps {
                echo "Retrieving secrets from Vault"
                script {

                    withVault(configuration: [
                        timeout: 60,
                        vaultCredentialId: 'vault-approle',
                        engineVersion: 2
                    ], 
                    vaultSecrets: [
                        [
                            path: "secrets/country-trivia/${ENV}/db",
                            secretValues: [
                                [envVar: 'DATABASE_URL', vaultKey: 'DATABASE_URL'],
                                [envVar: 'POSTGRESQL_DB', vaultKey: 'POSTGRESQL_DB'],
                                [envVar: 'POSTGRESQL_DB_PORT', vaultKey: 'POSTGRESQL_DB_PORT'],
                                [envVar: 'POSTGRESQL_USER', vaultKey: 'POSTGRESQL_USER'],
                                [envVar: 'POSTGRESQL_PASSWORD', vaultKey: 'POSTGRESQL_PASSWORD'],
                            ]
                        ],
                        [
                            path: "secrets/country-trivia/${ENV}/backend",
                            secretValues: [
                                [envVar: 'DJANGO_SECRET_KEY', vaultKey: 'DJANGO_SECRET_KEY'],
                                [envVar: 'ALLOWED_HOSTS', vaultKey: 'ALLOWED_HOSTS'],
                                [envVar: 'CORS_ALLOWED_ORIGINS', vaultKey: 'CORS_ALLOWED_ORIGINS'],
                                [envVar: 'CSRF_TRUSTED_ORIGINS', vaultKey: 'CSRF_TRUSTED_ORIGINS'],
                            ]
                        ],
                        [
                            path: "secrets/country-trivia/${ENV}/frontend",
                            secretValues: [
                                [envVar: 'VITE_URL_API', vaultKey: 'VITE_URL_API']
                            ]
                        ]
                    ]) {
                        echo 'Secrets retrieved successfully!'
                    }
                }
            }
        }

        stage('Lint Code') {
            steps {
                echo "Linting Frontend and Backend"
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run lint'
                }
                dir('backend') {
                    sh 'pip install flake8 black'
                    sh 'flake8 .'
                    sh 'black --check .'
                }
            }
        }

        stage('Build & Test Backend') {
            steps {
                echo "Building and Testing Backend"
                dir('backend') {

                    sh 'pip install -r requirements.txt'
                    sh 'python manage.py test'
                    
                    script {
                        docker.build(DOCKER_BACKEND)
                    }
                }
            }
        }
        
        stage('Build & Test Frontend') {
            steps {
                echo "Building and Testing Frontend"
                dir('frontend') {
                    
                    sh 'npm install'
                    
                    sh 'npm test'
                    
                    sh 'npm run build'
                    
                    script {
                        docker.build(DOCKER_FRONTEND)
                    }
                }
            }
        }

        stage('Deploy Application Locally') {
            steps {
                echo "Deploying Services Locally"
                sh """
                    docker compose -f ${DOCKER_COMPOSE_FILE} down
                    docker compose -f ${DOCKER_COMPOSE_FILE} up -d
                """
                // Uncomment below to force container recreation
                // sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d --force-recreate"
            }
        }
        
        stage('Collect Static Files') {
            steps {
                echo "Collecting Django Static Files"
                sh """
                    docker compose -f ${DOCKER_COMPOSE_FILE} exec backend python manage.py collectstatic --noinput --clear
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
                echo "Running Smoke Tests for Country Trivia"

                echo "Testing Country Trivia Frontend"
                sh "curl -f https://countrytrivia.rajivwallace.com || exit 1"

                echo "Testing Country Trivia Backend"
                sh "curl -f https://countrytrivia.rajivwallace.com/api/health || exit 1"
            }
        }
    }

    post {
        success {
            echo "Deployment completed successfully!"
        }
        failure {
            echo "Deployment failed. Rolling back to previous version. Check the logs for more information."

            sh 'docker compose rollback || true'
        }
    }
}