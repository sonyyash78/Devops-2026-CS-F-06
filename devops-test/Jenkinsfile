pipeline {
    agent any

    environment {
        APP_NAME        = 'devops-login-app'
        IMAGE_TAG       = "${env.BUILD_NUMBER ?: 'latest'}"
        CONTAINER_NAME  = 'devops-login-container'
        APP_PORT        = '3000'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Test & Validate') {
            steps {
                echo 'Running automated tests and validation suite...'
                sh '''
                    # Check node version
                    node -v
                    # Run unit & validation tests
                    npm test
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo "Building Docker image: ${APP_NAME}:${IMAGE_TAG} and ${APP_NAME}:latest..."
                sh """
                    docker build -t ${APP_NAME}:${IMAGE_TAG} -t ${APP_NAME}:latest .
                """
            }
        }

        stage('Deploy Container') {
            steps {
                echo "Deploying container: ${CONTAINER_NAME} on port ${APP_PORT}..."
                sh """
                    # Stop and remove existing container if running
                    docker stop ${CONTAINER_NAME} 2>/dev/null || true
                    docker rm ${CONTAINER_NAME} 2>/dev/null || true

                    # Start new container
                    docker run -d \\
                        --name ${CONTAINER_NAME} \\
                        -p ${APP_PORT}:3000 \\
                        --restart unless-stopped \\
                        ${APP_NAME}:latest
                """
            }
        }

        stage('Smoke Test & Health Check') {
            steps {
                echo 'Performing smoke tests on deployed container...'
                sh """
                    # Allow container a brief moment to initialize
                    sleep 5

                    # Check HTTP response from container
                    echo 'Checking GET /'
                    curl --fail --retry 3 --retry-delay 2 http://localhost:${APP_PORT}/

                    # Check POST /login endpoint with valid credentials
                    echo 'Checking POST /login with valid credentials'
                    curl --fail --retry 3 --retry-delay 2 -X POST http://localhost:${APP_PORT}/login \
                        -H 'Content-Type: application/json' \
                        -d '{"email":"tanish@gmail.com","password":"tanish@123"}'

                    # Check GET /log endpoint to verify single log file
                    echo 'Checking GET /log'
                    curl --fail --retry 3 --retry-delay 2 http://localhost:${APP_PORT}/log
                """
            }
        }
    }

    post {
        always {
            echo 'Cleaning up dangling images...'
            sh 'docker image prune -f 2>/dev/null || true'
        }
        success {
            echo "=========================================================="
            echo " CI/CD Pipeline Succeeded! Application is live at:        "
            echo " http://localhost:${APP_PORT}                             "
            echo "=========================================================="
        }
        failure {
            echo "=========================================================="
            echo " CI/CD Pipeline Failed! Inspecting container logs...      "
            echo "=========================================================="
            sh "docker logs ${CONTAINER_NAME} 2>/dev/null || true"
        }
    }
}
