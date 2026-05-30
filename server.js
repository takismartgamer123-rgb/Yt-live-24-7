const express = require('express');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const STREAM_KEY = process.env.YOUTUBE_KEY;
const VIDEO_PATH = path.join(__dirname, 'background.mp4');
const SUB_FILE = path.join(__dirname, 'subs.txt');
const OVERLAY_URL = process.env.OVERLAY_URL; // https://live-sub-count-me.onrender.com

let ffmpeg;

// نجيبو الرقم من موقعك مباشرة بلا متصفح
async function updateSubs() {
  try {
    // موقعك يرجع JSON ولا HTML؟ نجربو نجيبو الرقم
    const res = await axios.get(OVERLAY_URL + '?format=json'); 
    const count = res.data.subs || res.data.count || '0';
    fs.writeFileSync(SUB_FILE, `Subscribers: ${count}`);
    console.log('Updated:', count);
  } catch (e) {
    // إذا موقعك ما يرجعش JSON، نستعملو API خارجي
    try {
      const res2 = await axios.get('https://api.socialcounts.org/youtube-live-subscriber-count/UCCji3rVchUafZT6qxETGIxQ');
      fs.writeFileSync(SUB_FILE, `Subscribers: ${res2.data.est_sub}`);
    } catch {}
  }
}

function startStream() {
  if (ffmpeg) ffmpeg.kill();
  console.log('Starting stream...');
  
  ffmpeg = spawn('ffmpeg', [
    '-re', '-stream_loop', '-1', '-i', VIDEO_PATH,
    '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${SUB_FILE}:reload=1:fontcolor=white:fontsize=80:x=(w-text_w)/2:y=h-200:box=1:boxcolor=black@0.6:boxborderw=20`,
    '-c:v', 'libx264', '-preset', 'superfast', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-g', '60',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`
  ]);
  
  ffmpeg.stderr.on('data', d => {});
  ffmpeg.on('close', () => {
    console.log('FFmpeg died, restarting...');
    setTimeout(startStream, 2000);
  });
}

app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => {
  fs.writeFileSync(SUB_FILE, 'Subscribers: 0');
  updateSubs();
  setInterval(updateSubs, 3000); // كل 30 ثانية
  startStream();
  console.log('Server started');
});
