allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Some plugin modules (e.g. receive_sharing_intent) don't set their own
// Java/Kotlin compatibility, so they fall back to AGP's default of Java 8
// while the root Kotlin plugin (2.2.20) targets JVM 21 — a mismatch that
// only breaks the *release* build (`compileReleaseKotlin` vs
// `compileReleaseJavaWithJavac`), never `flutter run` in debug. Force every
// module to the same target the app itself already uses (17) rather than
// patching each plugin's build.gradle individually.
subprojects {
    // afterEvaluate is load-bearing: plugin modules set their own
    // android.compileOptions (Java 8) inside their own build.gradle,
    // which is evaluated as part of this project's normal lifecycle —
    // configuring tasks.withType directly here (without afterEvaluate)
    // loses to that later-applied module-local setting.
    afterEvaluate {
        // The Kotlin side (tasks.withType) reliably takes this override,
        // but AGP recomputes compileReleaseJavaWithJavac's source/target
        // compatibility FROM android.compileOptions during its own
        // variant-configuration pass — setting the task property directly
        // gets silently clobbered by that later pass. Go through the
        // android{} extension itself instead, which AGP treats as
        // authoritative.
        extensions.findByType(com.android.build.gradle.BaseExtension::class.java)?.apply {
            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_17
                targetCompatibility = JavaVersion.VERSION_17
            }
        }
        tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
            compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
