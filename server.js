const express = require('express');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_KEY = process.env.YOUTUBE_KEY;
const OVERLAY_URL = process.env.OVERLAY_URL;
const VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

let ffmpegProcess = null;

function startStream() {
  if (ffmpegProcess) return;
  console.log('Starting stream...');

  ffmpegProcess = spawn('ffmpeg', [
    '-re', '-stream_loop', '-1', '-i', VIDEO_URL,
    '-i', OVERLAY_URL,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto[v]',
    '-map', '[v]', '-map', '0:a',
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-maxrate', '2500k',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`
  ]);

  ffmpegProcess.stderr.on('data', (data) => console.log(`FFmpeg: ${data}`));
  ffmpegProcess.on('close', () => { ffmpegProcess = null; setTimeout(startStream, 5000); });
}

app.get('/', (req, res) => res.send('Stream Server Running'));
app.listen(PORT, () => { console.log(`Server on ${PORT}`); startStream(); });
