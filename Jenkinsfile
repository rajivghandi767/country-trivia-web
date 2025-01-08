pipeline {
    agent any
    
    environment {

        ENV = 'prod'
        DOCKER_BACKEND = 'country-trivia-backend'
        DOCKER_FRONTEND = 'country-trivia-frontend'
        
        VAULT_ADDR = 'https://vault.rajivwallace.com'

        APP_NAME = 'country-trivia'
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
        
        stage('Build & Test Backend') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    
                    sh 'npm test'
                    
                    script {
                        docker.build(DOCKER_BACKEND)
                    }
                }
            }
        }
        
        stage('Build & Test Frontend') {
            steps {
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
        
        stage('Deploy Application') {
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
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed. Rolling back to previous version. Check the logs for more information.'

            sh 'docker compose rollback || true'
        }
    }
}