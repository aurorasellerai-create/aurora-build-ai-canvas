const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ANDROID_HOME = process.env.ANDROID_HOME || "/root/android-sdk";

/**
 * Pipeline completo: URL → Projeto Capacitor → Build Android → AAB
 */
async function buildAAB(url, jobId, onProgress) {
  const buildDir = path.join("/tmp", `aurora-build-${jobId}`);
  const appName = `AuroraApp_${jobId.substring(0, 8)}`;

  try {
    // Step 2: Create Capacitor project
    fs.mkdirSync(buildDir, { recursive: true });

    // Create minimal web app that loads the URL
    const wwwDir = path.join(buildDir, "www");
    fs.mkdirSync(wwwDir, { recursive: true });

    fs.writeFileSync(
      path.join(wwwDir, "index.html"),
      `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, iframe { width: 100%; height: 100%; border: none; overflow: hidden; }
    .loading { display: flex; align-items: center; justify-content: center; height: 100vh; 
               background: #0a0a1a; color: #fff; font-family: system-ui; }
    .loading.hidden { display: none; }
    iframe { position: absolute; top: 0; left: 0; }
  </style>
</head>
<body>
  <div class="loading" id="loader">
    <p>Carregando...</p>
  </div>
  <iframe id="app" src="${url}" 
    allow="fullscreen; camera; microphone; geolocation"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    onload="document.getElementById('loader').classList.add('hidden')">
  </iframe>
  <script>
    // Handle Android back button
    document.addEventListener('backbutton', function() {
      const iframe = document.getElementById('app');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.history.back();
      }
    });
    // Retry on load failure
    const iframe = document.getElementById('app');
    iframe.onerror = function() {
      setTimeout(() => { iframe.src = "${url}"; }, 3000);
    };
  </script>
</body>
</html>`
    );

    // Create package.json
    fs.writeFileSync(
      path.join(buildDir, "package.json"),
      JSON.stringify({
        name: appName.toLowerCase(),
        version: "1.0.0",
        private: true,
      })
    );

    // Step 3: Initialize Capacitor
    await onProgress(3);

    const capConfig = {
      appId: `ai.aurorabuild.app.${jobId.replace(/-/g, "").substring(0, 12)}`,
      appName: appName,
      webDir: "www",
      server: {
        androidScheme: "https",
        allowNavigation: [new URL(url).hostname, `*.${new URL(url).hostname}`],
      },
      android: {
        allowMixedContent: true,
        backgroundColor: "#0a0a1a",
        overrideUserAgent: `AuroraBuild/1.0 ${appName}`,
      },
      plugins: {
        SplashScreen: {
          launchAutoHide: true,
          launchShowDuration: 2000,
          backgroundColor: "#0a0a1a",
          showSpinner: true,
          spinnerColor: "#FFD700",
        },
      },
    };

    fs.writeFileSync(
      path.join(buildDir, "capacitor.config.json"),
      JSON.stringify(capConfig, null, 2)
    );

    // Install Capacitor
    execSync("npm init -y && npm install @capacitor/core @capacitor/android @capacitor/cli", {
      cwd: buildDir,
      stdio: "pipe",
      timeout: 120000,
    });

    // Add Android platform
    await onProgress(4);
    execSync("npx cap add android", {
      cwd: buildDir,
      stdio: "pipe",
      timeout: 120000,
      env: { ...process.env, ANDROID_HOME },
    });

    // Sync
    execSync("npx cap sync android", {
      cwd: buildDir,
      stdio: "pipe",
      timeout: 120000,
      env: { ...process.env, ANDROID_HOME },
    });

    // Step 4: Configure Android project
    await onProgress(4);
    configureAndroidProject(buildDir, appName);

    // Step 5: Build AAB with Gradle
    await onProgress(5);
    const gradlew = path.join(buildDir, "android", "gradlew");
    fs.chmodSync(gradlew, "755");

    execSync("./gradlew bundleRelease --no-daemon --stacktrace", {
      cwd: path.join(buildDir, "android"),
      stdio: "pipe",
      timeout: 300000, // 5 min
      env: {
        ...process.env,
        ANDROID_HOME,
        JAVA_HOME: process.env.JAVA_HOME || "/usr/lib/jvm/java-17-openjdk-amd64",
      },
    });

    // Find AAB file
    const aabPath = path.join(
      buildDir,
      "android",
      "app",
      "build",
      "outputs",
      "bundle",
      "release",
      "app-release.aab"
    );

    if (!fs.existsSync(aabPath)) {
      throw new Error("AAB file not generated. Build may have failed silently.");
    }

    const stats = fs.statSync(aabPath);
    console.log(`[BUILD] AAB generated: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return { aabPath, size: stats.size };
  } catch (err) {
    // Cleanup on error
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    throw err;
  }
}

/**
 * Configure Android project for better WebView experience
 */
function configureAndroidProject(buildDir, appName) {
  const mainActivityPath = path.join(
    buildDir,
    "android",
    "app",
    "src",
    "main",
    "java"
  );

  // Update AndroidManifest for internet + fullscreen
  const manifestPath = path.join(
    buildDir,
    "android",
    "app",
    "src",
    "main",
    "AndroidManifest.xml"
  );

  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, "utf8");

    // Add internet permission if not present
    if (!manifest.includes("android.permission.INTERNET")) {
      manifest = manifest.replace(
        "<application",
        '<uses-permission android:name="android.permission.INTERNET" />\n    <application'
      );
    }

    // Add network security config
    if (!manifest.includes("usesCleartextTraffic")) {
      manifest = manifest.replace(
        "<application",
        '<application android:usesCleartextTraffic="true"'
      );
    }

    fs.writeFileSync(manifestPath, manifest);
  }

  // Configure Gradle for release build
  const buildGradlePath = path.join(buildDir, "android", "app", "build.gradle");
  if (fs.existsSync(buildGradlePath)) {
    let buildGradle = fs.readFileSync(buildGradlePath, "utf8");

    // Add release signing config (debug key for now)
    if (!buildGradle.includes("signingConfigs")) {
      const signingConfig = `
    signingConfigs {
        release {
            storeFile file("${path.join(buildDir, "android", "app", "debug.keystore")}")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }`;

      buildGradle = buildGradle.replace(
        "buildTypes {",
        `${signingConfig}\n    buildTypes {`
      );

      buildGradle = buildGradle.replace(
        "release {",
        'release {\n            signingConfig signingConfigs.release'
      );
    }

    fs.writeFileSync(buildGradlePath, buildGradle);

    // Generate debug keystore if not exists
    const keystorePath = path.join(buildDir, "android", "app", "debug.keystore");
    if (!fs.existsSync(keystorePath)) {
      try {
        execSync(
          `keytool -genkey -v -keystore "${keystorePath}" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Aurora Build AI, OU=Dev, O=Aurora, L=SP, S=SP, C=BR"`,
          { stdio: "pipe", timeout: 30000 }
        );
      } catch (e) {
        console.warn("[BUILD] Could not generate keystore, using default");
      }
    }
  }
}

module.exports = { buildAAB };
