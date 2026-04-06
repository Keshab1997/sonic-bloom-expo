# Android APK Build Process

## Overview
This document describes how to build a standalone Android APK with bundled JavaScript that works without a Metro dev server.

## Problem
The default Expo/React Native debug APK requires a Metro dev server to run. To create an APK that works offline/independently, the JavaScript bundle must be embedded in the APK.

## Solution

### 1. GitHub Actions Workflow
Location: `.github/workflows/build-android.yml`

```yaml
name: Build Android APK

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: npm install

      - name: Apply patches
        run: npx patch-package

      - name: Bundle JS for Android
        run: npx expo export --platform android

      - name: Copy JS bundle to Android assets
        run: |
          mkdir -p android/app/src/main/assets
          cp -r dist/* android/app/src/main/assets/

      - name: Build APK with bundled JS
        run: cd android && ./gradlew :app:assembleDebug --no-daemon
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: sonic-bloom-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 7
```

### 2. Patch for react-native-track-player
The `react-native-track-player@4.0.1` has Kotlin 2.x compatibility issues. A patch is required.

Location: `patches/react-native-track-player+4.0.1.patch`

Changes made:
- `MusicModule.kt`: Fixed nullable Bundle type issue (line 548, 588)
- `MusicService.kt`: Fixed `onBind` return type (line 764)

### 3. Environment Variables
Store Supabase credentials as GitHub secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Build Steps

### Local Build (for testing)
```bash
# Install dependencies
npm install

# Apply patches
npx patch-package

# Bundle JS
npx expo export --platform android

# Copy to assets
mkdir -p android/app/src/main/assets
cp -r dist/* android/app/src/main/assets/

# Build APK
cd android
./gradlew :app:assembleDebug
```

### GitHub Actions Build
1. Push code to `main` branch
2. Go to GitHub Actions
3. Wait for "Build Android APK" to complete
4. Download artifact: `sonic-bloom-debug`

## Troubleshooting

### Error: react-native-track-player Kotlin compilation
**Fix**: Apply patch-package or update to a compatible version

### Error: JS bundle not found
**Fix**: Ensure `npx expo export --platform android` runs before gradle build

### APK requires Metro server
**Fix**: Ensure JS bundle is copied to `android/app/src/main/assets/`

## Notes
- The bundled APK is larger but works offline
- Environment variables are embedded at build time
- Debug build can be installed without signing