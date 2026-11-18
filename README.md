# STOP MOTION STUDIO
Discord bot that turns ordered image frames into MP4 stop-motion videos.

## Deploy
- Node.js 20+
- Install: `npm install`
- Start: `npm start`
- Secret: `DISCORD_TOKEN` (or `BOT_TOKEN`)
- Enable Message Content Intent in Discord Developer Portal.
- Use a persistent mounted disk and set `STUDIO_DATA_DIR`; otherwise projects and images can be lost on redeploy.
- Run one bot instance only; the JSON store is single-process.

## Use
1. `+add` opens the control panel.
2. Click **مشروع جديد**.
3. Click **إضافة صور** and upload images in order in that channel.
4. Send `+done`.
5. Set FPS, resolution and aspect ratio.
6. Preview, optionally add audio, then export MP4.
7. `+help` displays the guide.

## Limits
Defaults: 80 frames, 8MB/image, 15MB/audio. Discord upload limits still apply. FFmpeg is bundled using ffmpeg-static. Keep backups of original media.
Environment: `PREFIX`, `STUDIO_DATA_DIR`, `MAX_FRAMES`, `MAX_IMAGE_BYTES`, `MAX_AUDIO_BYTES`.
