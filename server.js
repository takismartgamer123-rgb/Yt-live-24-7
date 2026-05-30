const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_KEY = process.env.YOUTUBE_KEY;
const OVERLAY_URL = process.env.OVERLAY_URL;
const VIDEO_PATH = path.join(__dirname, 'background.mp4'); // الفيديو من الريبو

let ffmpegProcess = null;

function startStream() {
  if (ffmpegProcess) return;
  console.log('Starting stream with local video...');

  ffmpegProcess = spawn('ffmpeg', [
    '-re', '-stream_loop', '-1', '-i', VIDEO_PATH, // يقرا من الملف المحلي
    '-i', OVERLAY_URL,
    '-filter_complex', '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[bg];[bg][1:v]overlay=0:0:format=auto[v]',
    '-map', '[v]', '-map', '0:a?', //? تعني إذا ما كانش صوت ما يكراشي
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-b:v', '2500k',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`
  ]);

  ffmpegProcess.stderr.on('data', (data) => console.log(`FFmpeg: ${data}`));
  ffmpegProcess.on('close', (code) => {
    console.log(`Stream ended: ${code}. Restarting...`);
    ffmpegProcess = null;
    setTimeout(startStream, 3000);
  });
}

app.get('/', (req, res) => res.send('ɪʈʂ ʈɑkɪ!! Stream Server Running 🔴'));
app.listen(PORT, () => { console.log(`Server on ${PORT}`); startStream(); });
