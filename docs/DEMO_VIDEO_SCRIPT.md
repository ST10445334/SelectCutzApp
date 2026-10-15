# Demonstration video - script and shot list (about 5 minutes)

Record the phone screen: `adb shell screenrecord --time-limit 180 /sdcard/part1.mp4` then `adb pull /sdcard/part1.mp4` (3-minute limit per clip), or use **scrcpy** (`scrcpy --record demo.mp4`), or the phone's built-in screen recorder. Add your voice with any editor (Clipchamp, CapCut, OBS). Use two customer accounts and one admin; create them beforehand.

| Time | Show | Say |
|---|---|---|
| 0:00 | Title card: SELECT CUTZ - team names | Purpose of the app (barber bookings) |
| 0:15 | Phone: app opens, Home, Services (live records and images), Gallery | Data is read live from MySQL through the PHP API |
| 0:45 | Register a new customer (try a short password first -> validation message), then log in | Passwords are hashed; sessions are server side |
| 1:15 | Book: pick time, date, service -> confirmation screen | Booking saved in the database |
| 1:40 | Try to book the same slot with a second account -> "already booked" message | Duplicate protection (database rule + server check) |
| 2:00 | My Bookings, notifications (New badge, Mark all as read) -> Cancel the booking -> cancellation notification | Cancellation + notifications |
| 2:30 | Turn Wi-Fi/Apache off -> open Services/booking -> friendly error + Try again; turn back on | Timeouts and error states (6 s limit) |
| 3:00 | Log in as admin: Dashboard, Manage Services (add a service with image), Reports, Logo & Owner | Role checks: customers cannot open these |
| 3:50 | Admin > Gallery: upload an image, show it on the public Gallery, delete it | Gallery upload flow (JPG/PNG/WebP, max 5 MB) |
| 4:20 | PC: GitHub Actions / Azure DevOps green run, test report (57 API + 50 unit tests), downloaded APK | CI/CD and evidence |
| 4:50 | Defect log summary (20 fixed, open items) | Quality process; close |
