# Archived — Capacitor Android app build

Experimental Android packaging (Capacitor, Gradle, APK). The live project is the browser app at the repo root.

## Contents

| Path | Description |
|------|-------------|
| `www/` | Web assets bundled into the APK |
| `android/` | Android Studio / Gradle project |
| `backup/` | Original monolithic `index.html` snapshot |
| `tools/` | Split/extract scripts |
| `6-Pack-Challenge-debug.apk` | Last debug build |
| `package.json` | Capacitor dependencies |

Run `npm install` here before rebuilding (`node_modules` is not archived).

## Rebuild APK

```powershell
cd archive\app-build
npm install
npx cap sync android
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk`
