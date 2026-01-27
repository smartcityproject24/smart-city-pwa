node('master') {
    try {
        def appName = "pwa"
        def addVersion = "prod"
        stage('Clean') {
            sh "rm -rf /var/lib/jenkins/workspace/Front_Pwa_master/*"
        }
        stage('Checkout') {
            println("Checkout $appName-$addVersion")
            checkout scm
        }
        stage ('Setup service') {
            sh "chown -R 777 /var/lib/jenkins/workspace/Front_Pwa_master/"
            sh "npm install"
            sh "npm run build"
            sh "chmod -R 777 /var/lib/jenkins/workspace/Front_Pwa_master/node_modules/.vite-temp 2>/dev/null || true"
        }
        stage ('Start service') {
            sh "systemctl restart smart_pwa_prod.service"
        }
    } catch (Exception e) {
        currentBuild.result = "FAILURE"
        println "FAILURE $e"
        //commonNotifyAboutBuildStatus(status: currentBuild.result, exception: e)
        throw e
    } finally {
        println("finally action")
    }
}
