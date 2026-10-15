# Build and install on a phone (Person 3: "signed/debug build and install on phone")

Needs: Node 24 LTS, Android Studio (SDK Platform 36), JDK 21 (bundled with Android Studio), XAMPP, a phone with USB debugging on.
(Phone: Settings > About phone > tap *Build number* 7 times > Developer options > USB debugging.)

## A. Debug build on your phone with XAMPP (easiest for the demo)
1. Start Apache + MySQL in XAMPP. Import `database/select_cutz_db.sql` (new) or run `database/migration_person3.sql` once (existing DB).
2. Check the API in a browser: `http://localhost/SelectCutzApp_READY/SelectCutzApp/backend/api/health.php` -> `"success":true`.
3. In the project folder:
   ```
   npm ci
   npm run android:debug          # builds the web app, syncs it, runs gradle assembleDebug
   ```
   APK: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Connect the phone by USB, accept the prompt, then:
   ```
   adb devices
   adb reverse tcp:8080 tcp:80    # phone's localhost:8080 -> PC's XAMPP (already what environment.ts expects)
   npm run android:install        # adb install -r ...app-debug.apk
   ```
   Alternative to `adb reverse` (Wi-Fi): `npm run api:url -- --dev http://<PC-IPv4>/SelectCutzApp_READY/SelectCutzApp/backend/api`, rebuild, allow Apache through Windows Firewall (private network).
5. Open **SELECT CUTZ** on the phone and run the checklist in `TEST_PLAN_AND_EVIDENCE.md` section 4.
Tip: no cable? copy `app-debug.apk` to the phone and open it (allow "install unknown apps").

## B. Signed release build (what you submit / publish)
1. One-time - create a keystore (keep it OUT of git, back it up, never lose the passwords):
   ```
   keytool -genkeypair -v -keystore selectcutz-release.jks -alias selectcutz -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Create `android/keystore.properties` (git-ignored):
   ```
   storeFile=C:/keys/selectcutz-release.jks
   storePassword=...
   keyAlias=selectcutz
   keyPassword=...
   ```
3. Point the app at the **hosted HTTPS API** (release builds block plain http) and build:
   ```
   npm run api:url -- https://YOUR-DOMAIN/api
   npm run android:release
   ```
   APK: `android/app/build/outputs/apk/release/app-release.apk` (signed automatically). Verify: `apksigner verify --print-certs app-release.apk` (in Android SDK build-tools).
   Using a plain-http host for a classroom demo only: add `-PallowCleartext=true` to the gradle command.
4. Install: `adb install -r android/app/build/outputs/apk/release/app-release.apk`

## C. CI builds
GitHub Actions / Azure DevOps build the debug APK on every push and a signed release on `main` when the keystore secrets exist (see `CI_CD_AND_INTEGRATION.md`). Download it from the run's *Artifacts*.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| App shows "Cannot reach the SELECT CUTZ API" | Apache/MySQL not running, `adb reverse` not run after re-plugging the phone, wrong IP, or firewall |
| "Angular CLI requires a minimum Node.js version" | Install Node 24 LTS (`node -v`) |
| `npm ci` complains about the lock file | Use the lock file from this repo (it was regenerated) |
| Gradle: SDK location not found | Android Studio > SDK Manager, or create `android/local.properties` with `sdk.dir=...` |
| Phone not listed in `adb devices` | USB debugging on, "File transfer" mode, try another cable |
