pipeline {
    agent any
    
    environment {
        DOCKER_BACKEND = 'country-trivia-backend'
        DOCKER_FRONTEND = 'country-trivia-frontend'
        
        VAULT_CREDENTIALS = credentials('vault-credentials')
        
        APP_NAME = 'country-trivia'
        DEPLOY_HOST = 'https://db.rajivwallace.com'
    }
    
    stages {
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
        
        // Build and test frontend
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
        
        stage('Configure Application') {
            steps {
                script {
                    def vaultSecrets = sh(
                        script: """
                            curl -H "X-Vault-Token: ${VAULT_CREDENTIALS}" \
                                ${VAULT_ADDR}/v1/secret/data/${APP_NAME} | jq .data.data
                        """,
                        returnStdout: true
                    ).trim()
                    
                    def secrets = readJSON text: vaultSecrets
                    
                    writeFile file: 'docker-compose.override.yml', text: """
                        
                        services:
                          backend:
                            environment:
                              - DB_USER=${secrets.db_user}
                              - DB_PASSWORD=${secrets.db_password}
                              - JWT_SECRET=${secrets.jwt_secret}
                          frontend:
                            environment:
                              - API_URL=https://countrytrivia.rajivwallace.com/api
                    """
                }
            }
        }
        
        stage('Deploy Application') {
            steps {
                script {
                    
                    sh 'docker-compose down || true'
                    
                    
                    sh 'docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d'
                    
                    // Wait for services to be healthy
                    sh '''
                        timeout 30 bash -c 'until $(curl -s -o /dev/null -w "%{http_code}" localhost:3000/health | grep -q 200); do
                            echo "Waiting for backend to be ready..."
                            sleep 2
                        done'
                    '''
                }
            }
        }
        
        stage('Verifying Deployment') {
            steps {
                script {
                    sh 'curl -s -o /dev/null -w "%{http_code}" https://countrytrivia.rajivwallace.com'
                    
                    sh 'curl -s -o /dev/null -w "%{http_code}" https://api.countrytrivia.rajivwallace.com/health'
                    
                    sh """
                        curl -X POST ${VAULT_ADDR}/v1/secret/data/${APP_NAME}/deployments \
                            -H "X-Vault-Token: ${VAULT_CREDENTIALS}" \
                            -d '{
                                "data": {
                                    "last_deploy": "'$(date -u)'"
                                }
                            }'
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
            // Roll back to previous version if deployment fails
            sh 'docker compose rollback || true'
        }
    }
}