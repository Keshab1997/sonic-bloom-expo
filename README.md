# 🎵 Sonic Bloom

**Sonic Bloom** একটি Android মিউজিক প্লেয়ার অ্যাপ যা JioSaavn API ব্যবহার করে গান খুঁজে বের করে এবং স্ট্রিম করে। এটি Expo (React Native) দিয়ে তৈরি।

---

## ✅ অ্যাপের ফিচারস

- 🔍 গান সার্চ করা (JioSaavn API)
- ▶️ গান প্লে, পজ, নেক্সট, প্রিভিয়াস
- 📥 গান ডাউনলোড করা
- ❤️ লাইকড সং লিস্ট
- 📋 প্লেলিস্ট তৈরি করা
- 🔒 লক স্ক্রিনে মিউজিক কন্ট্রোল
- 🔇 ব্যাকগ্রাউন্ড প্লেব্যাক
- 👤 Supabase দিয়ে ইউজার অথেনটিকেশন
- 🌙 স্লিপ টাইমার
- ⚡ EQ প্রিসেট (Rock, Pop, Bass, Vocal ইত্যাদি)
- 📶 অফলাইন ক্যাশ সাপোর্ট

---

## 🛠️ টেকনোলজি স্ট্যাক

| টেকনোলজি | ব্যবহার |
|----------|---------|
| React Native 0.81 | মোবাইল অ্যাপ ফ্রেমওয়ার্ক |
| Expo SDK 54 | নেটিভ মডিউল ম্যানেজমেন্ট |
| react-native-track-player 4.0.1 | মিউজিক প্লেব্যাক ইঞ্জিন |
| Supabase | ব্যাকএন্ড ও অথেনটিকেশন |
| TanStack Query | ডেটা ফেচিং ও ক্যাশিং |
| AsyncStorage | লোকাল স্টোরেজ |
| Expo Linear Gradient | UI ডিজাইন |

---

## 🔧 ক্র্যাশ ফিক্স — কী কী সমস্যা ছিল এবং কীভাবে ঠিক করা হয়েছে

এই প্রজেক্টে অ্যাপটি open করার সাথে সাথে crash করছিল। নিচে সব সমস্যা এবং সমাধান দেওয়া হলো:

### 1. 🔴 New Architecture (TurboModules) ক্র্যাশ
**সমস্যা:**
অ্যাপে `newArchEnabled: true` ছিল। কিন্তু `react-native-track-player 4.0.1` এই নতুন আর্কিটেকচারের সাথে সম্পূর্ণ কম্প্যাটিবল না। ফলে অ্যাপ open হওয়ার সাথে সাথে এই এরর আসছিল:
```
TurboModuleInteropUtils$ParsingException: Unable to parse @ReactMethod 
annotations from native module: TrackPlayerModule
```

**সমাধান:**
- `app.json` → `"newArchEnabled": false`
- `android/gradle.properties` → `newArchEnabled=false`

---

### 2. 🔴 MusicService AndroidManifest-এ ছিল না
**সমস্যা:**
Android 14+ এ background audio service চালাতে হলে `AndroidManifest.xml`-এ `MusicService` এর entry থাকা বাধ্যতামূলক। না থাকলে অ্যাপ install করার পর সাথে সাথে crash করে।

**সমাধান:**
`android/app/src/main/AndroidManifest.xml`-এ যোগ করা হয়েছে:
```xml
<service android:name="com.doublesymmetry.trackplayer.service.MusicService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MEDIA_BUTTON" />
        <action android:name="com.doublesymmetry.trackplayer.service.STOP" />
    </intent-filter>
</service>
```

---

### 3. 🔴 patch-package GitHub Actions-এ apply হচ্ছিল না
**সমস্যা:**
`patches/react-native-track-player+4.0.1.patch` ফাইলে দুটো গুরুত্বপূর্ণ Android null pointer crash fix ছিল। কিন্তু GitHub Actions-এ `npm install`-এর পরে এই patch apply করার কোনো step ছিল না।

**সমাধান:**
`.github/workflows/build-android.yml`-এ যোগ করা হয়েছে:
```yaml
- name: Apply patches
  run: npx patch-package
```

---

### 4. 🔴 Expo Config Plugin এরর
**সমস্যা:**
`app.json`-এ `react-native-track-player` এবং `react-native-volume-manager` plugin হিসেবে যোগ করা হয়েছিল, কিন্তু এই লাইব্রেরিগুলোর কোনো Expo config plugin নেই। ফলে `expo prebuild` সময় এরর আসছিল:
```
PluginError: Unable to resolve a valid config plugin for react-native-track-player
```

**সমাধান:**
- `app.json` থেকে এই plugin entries সরিয়ে দেওয়া হয়েছে
- Android native ফোল্ডারে manually কনফিগার করা হয়েছে
- GitHub Actions থেকে `expo prebuild --clean` step সরিয়ে দেওয়া হয়েছে

---

### 5. 🟡 Proguard Rules যোগ করা
**সমস্যা:**
Release build-এ Proguard track player-এর কিছু ক্লাস strip করে দিচ্ছিল।

**সমাধান:**
`android/app/proguard-rules.pro`-এ যোগ করা হয়েছে:
```
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keep interface com.doublesymmetry.trackplayer.** { *; }
```

---

### 6. 🟡 App.tsx Startup Logic ঠিক করা
**সমস্যা:**
SplashScreen এবং RootNavigator একই সময়ে render হচ্ছিল, যা memory চাপ বাড়িয়ে দিচ্ছিল।

**সমাধান:**
```tsx
// আগে (সমস্যাযুক্ত)
{!splashFinished && <SplashScreen />}
<RootNavigator />   // দুটো একসাথে লোড হতো

// এখন (ঠিক করা)
{splashFinished ? <RootNavigator /> : <SplashScreen />}  // একটার পরে আরেকটা
```

---

## 📦 APK বানানোর নিয়ম

### GitHub Actions দিয়ে (সবচেয়ে সহজ, যেকোনো কম্পিউটারে):
```bash
git add .
git commit -m "your message"
git push
```
তারপর GitHub → Actions → Build Android APK → সবুজ হলে `Sonic-Bloom-APK` ডাউনলোড করুন।

### লোকালি বানাতে চাইলে:
```bash
npm install
npx patch-package
cd android && ./gradlew :app:assembleRelease
```
APK থাকবে: `android/app/build/outputs/apk/release/app-release.apk`

---

## ⚙️ Environment Variables

Supabase সেটআপের জন্য `.env` ফাইল বানান:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ এই ফাইলটি কখনো GitHub-এ push করবেন না।

---

## 📱 পরীক্ষিত ডিভাইস

- Android 13 (API 33) ✅
- Android 14 (API 34) ✅
- Android 15 (API 35) ✅

---

## 📝 গুরুত্বপূর্ণ নোট

- এই অ্যাপ **Expo Go**-তে চলবে না কারণ এতে custom native module আছে
- শুধুমাত্র **Release APK** বা **Development Build** ব্যবহার করুন
- Debug APK (~72MB) এবং Release APK (~52MB) এর সাইজের পার্থক্য স্বাভাবিক — Release-এ debug tools থাকে না তাই ছোট হয়
