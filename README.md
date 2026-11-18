# STOP MOTION STUDIO
Discord-based stop-motion editor. Build image sequences, tune output settings, preview, and export MP4 from one persistent control panel.

## Deploy
- Node.js 20+
- Install: `npm install`
- Start: `npm start`
- Secret: `DISCORD_TOKEN` (or `BOT_TOKEN`)
- Enable **Message Content Intent** in Discord Developer Portal.
- Mount a persistent disk and set `STUDIO_DATA_DIR`; otherwise project metadata and source frames may be lost on redeploy.
- Run one bot instance only; the JSON store is single-process.

## Commands
- `+add` or `+panel`: open or refresh your saved control panel in the current channel.
- `+help`: show the guide.
- `+done`: finish image/audio upload mode.
- `+cancel`: stop receiving uploads.

The dashboard message is reused in the same channel instead of creating a new panel every time. Buttons update the dashboard in place.

## Studio workflow
1. Open `+panel`, then click **مشروع جديد**.
2. Click **إضافة صور** and send JPG, PNG, or WEBP images in the desired order.
3. Click **إنهاء الرفع** or send `+done`.
4. Use **إعدادات الفيديو** to choose each setting independently:
   - FPS: 6, 8, 10, 12, 15, 24, or 30.
   - Resolution: 480p, 720p, or 1080p.
   - Aspect ratio: landscape 16:9, portrait 9:16, or square 1:1.
5. Use **تسمية المشروع**, **حذف إطار برقم**, or **حذف آخر إطار** to manage the active project.
6. Use **مشاريعي** to switch between saved projects.
7. Preview the result, optionally add one audio file, then export MP4.

## Limits and storage
Defaults: 80 frames, 8MB per image, 15MB per audio file. Discord upload limits still apply. FFmpeg is bundled through `ffmpeg-static`.

Environment variables: `PREFIX`, `STUDIO_DATA_DIR`, `MAX_FRAMES`, `MAX_IMAGE_BYTES`, `MAX_AUDIO_BYTES`.

Keep a backup of the persistent data directory. The project JSON store is designed for a single running bot process, not multiple replicas.
