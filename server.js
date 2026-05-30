const express = require('express');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core'); // بدلناها لـ core
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_KEY = process.env.YOUTUBE_KEY;
const OVERLAY_URL = process.env.OVERLAY_URL;
const VIDEO_PATH = path.join(__dirname, 'background.mp4');

let browser, page, ffmpegProcess;

async function startBrowser() {
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium', // نستعملو Chrome تاع السيرفر
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(OVERLAY_URL, { waitUntil: 'networkidle0', timeout: 60000 });
  console.log('Browser opened overlay');
}

function startFFmpeg() {
  if (ffmpegProcess) return;
  console.log('Starting FFmpeg stream...');

  const ffmpeg = spawn('ffmpeg', [
    '-f', 'x11grab', '-video_size', '1920x1080', '-r', '30', '-i', ':99',
    '-i', VIDEO_PATH,
    '-filter_complex', '[1:v]scale=1920:1080[bg];[bg][0:v]overlay=0:0:format=auto[v]',
    '-map', '[v]', '-map', '1:a?',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k',
    '-pix_fmt', 'yuv420p', '-g', '60',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`
  ]);

  ffmpeg.stderr.on('data', (data) => console.log(`FFmpeg: ${data}`));
  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg ended: ${code}. Restarting...`);
    ffmpegProcess = null;
    setTimeout(startFFmpeg, 3000);
  });
  ffmpegProcess = ffmpeg;
}

app.get('/', (req, res) => res.send('ɪʈʂ ʈɑkɪ!! Stream Server Running 🔴'));
app.listen(PORT, async () => {
  console.log(`Server on ${PORT}`);
  await startBrowser();
  startFFmpeg();
});
