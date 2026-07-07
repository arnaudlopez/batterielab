FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

VOLUME ["/data"]
EXPOSE 3000

CMD ["npm", "start"]
