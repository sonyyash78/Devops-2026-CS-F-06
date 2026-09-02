pipeline {
    agent any

    triggers {
        githubPush()
    }

    options {
        timestamps()
        skipDefaultCheckout()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                        sh 'npm ci --prefix server'
                        sh 'npm ci --prefix client --legacy-peer-deps'
                    } else {
                        bat 'npm ci'
                        bat 'npm ci --prefix server'
                        bat 'npm ci --prefix client --legacy-peer-deps'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'NO_COLOR=1 npm --prefix server test > test-results.log'
                    } else {
                        bat 'set NO_COLOR=1 && npm --prefix server test > test-results.log'
                    }
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm --prefix client run lint'
                    } else {
                        bat 'npm --prefix client run lint'
                    }
                }
            }
        }

        stage('Build Client') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm --prefix client run build'
                    } else {
                        bat 'npm --prefix client run build'
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results.log', allowEmptyArchive: true
            deleteDir()
        }
    }
}


