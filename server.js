const express = require('express');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();
const PORT = 3000;

const STREAM_KEY = process.env.YOUTUBE_KEY;
const OVERLAY_URL = process.env.OVERLAY_URL;
const VIDEO_PATH = path.join(__dirname, 'background.mp4');

let browser, ffmpeg;

async function start() {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(OVERLAY_URL);
  console.log('Browser ready');

  ffmpeg = spawn('ffmpeg', [
    '-f', 'x11grab', '-r', '30', '-s', '1920x1080', '-i', ':0',
    '-i', VIDEO_PATH,
    '-filter_complex', '[1:v]scale=1920:1080[bg];[bg][0:v]overlay=0:0[v]',
    '-map', '[v]', '-map', '1:a?',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '2000k',
    '-c:a', 'aac', '-f', 'flv', `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`
  ]);
  ffmpeg.stderr.on('data', d => console.log(`FFmpeg: ${d}`));
}

app.get('/', (req, res) => res.send('Live ✅'));
app.listen(PORT, start);
