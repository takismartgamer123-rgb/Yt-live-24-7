FROM node:18-bullseye

# نصب Chrome + FFmpeg + XVFB
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json./
RUN npm install
COPY..

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["xvfb-run", "--server-args=-screen 0 1920x1080x24", "node", "server.js"]
