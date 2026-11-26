plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.novyra.preview"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.novyra.preview"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-preview"
    }
}
