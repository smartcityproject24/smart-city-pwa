node('master') {
    try {
        def appName = "pwa"
        def addVersion = "dev"
        stage('Clean') {
            sh "rm -rf /var/lib/jenkins/workspace/Front_Pwa_develop/*"
        }
        stage('Checkout') {
            println("Checkout $appName-$addVersion")
            checkout scm
        }
        stage ('Setup service') {
            sh "chown -R 777 /var/lib/jenkins/workspace/Front_Pwa_develop/"
            sh "npm install"
            sh "npm run build"
            sh "chmod -R 777 /var/lib/jenkins/workspace/Front_Pwa_develop/node_modules/.vite-temp 2>/dev/null || true"
        }
        stage ('Start service') {
            sh "systemctl restart smart_pwa_dev.service"
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
