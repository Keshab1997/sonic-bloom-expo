# App Crash Fixes - Sonic Bloom

## সমস্যা
App open হওয়ার পর immediately crash হচ্ছিল।

## কারণ এবং সমাধান

### 1. **TrackPlayer Duplicate Registration** ❌
**সমস্যা:** TrackPlayer দুইবার register হচ্ছিল:
- একবার `index.ts`-এ
- আরেকবার `App.tsx`-এ

**সমাধান:** `App.tsx` থেকে duplicate registration remove করা হয়েছে।

### 2. **TrackPlayer Initialization Error** ❌
**সমস্যা:** TrackPlayer setup করার সময় check করা হচ্ছিল না যে already initialized কিনা।

**সমাধান:** `AudioService.ts`-এ proper initialization check যোগ করা হয়েছে:
```typescript
// Check if already initialized
const state = await TrackPlayer.getState();
```

### 3. **Android Permissions Missing** ❌
**সমস্যা:** Android 13+ এর জন্য `READ_MEDIA_AUDIO` permission ছিল না।

**সমাধান:** `AndroidManifest.xml`-এ permission যোগ করা হয়েছে:
```xml
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO"/>
```

### 4. **Hermes Engine Polyfill Missing** ❌
**সমস্যা:** Hermes engine URL parsing করতে পারছিল না।

**সমাধান:** `index.ts`-এ URL polyfill যোগ করা হয়েছে:
```typescript
import 'react-native-url-polyfill/auto';
```

### 5. **Error Boundary Added** ✅
**উন্নতি:** Global error handler যোগ করা হয়েছে যাতে crash হলে error message দেখা যায়।

## এখন কী করবেন?

### 1. **Clean Build করুন:**
```bash
cd android
./gradlew clean
cd ..
```

### 2. **Rebuild করুন:**
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew :app:assembleRelease
```

### 3. **APK Test করুন:**
APK install করে test করুন: `android/app/build/outputs/apk/release/app-release.apk`

## Expected Result ✅

- ✅ App open হবে
- ✅ Splash screen দেখাবে
- ✅ Home screen load হবে
- ✅ Music search এবং play করতে পারবেন
- ✅ Background playback কাজ করবে
- ✅ Lock screen controls কাজ করবে

## যদি এখনও crash হয়:

### Debug করার জন্য:
```bash
# Android device connect করে logcat দেখুন
adb logcat | grep -i "sonic\|error\|crash"
```

### Common Issues:
1. **Network Error:** Internet connection check করুন
2. **API Error:** JioSaavn API down আছে কিনা check করুন
3. **Supabase Error:** `.env` file-এ credentials ঠিক আছে কিনা check করুন

## Notes:
- Release APK sign করা নেই - install করার সময় "Unknown source" warning আসবে
- Signing setup করতে চাইলে বলুন
