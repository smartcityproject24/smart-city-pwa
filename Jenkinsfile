node('master') {
    try {
        def appName = "webpwa"
        def addVersion = "prod"
        stage('Clean') {
            sh "rm -rf /var/lib/jenkins/workspace/Front_Web-pva_master/*"
        }
        stage('Checkout') {
            println("Checkout $appName-$addVersion")
            checkout scm
        }
        stage ('Setup service') {
            sh "chown -R 777 /var/lib/jenkins/workspace/Front_Web-pva_master/"
            sh "npm install"
            sh "npm run build"
        }
        stage ('Start service') {
            sh "systemctl restart smart_web_pva_prod.service"
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
