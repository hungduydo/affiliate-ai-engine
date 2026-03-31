FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Install Xvfb for virtual display (needed to run Chrome in non-headless mode)
RUN apt-get update && apt-get install -y xvfb && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.mjs entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENV PORT=3000
ENV IS_DOCKER=1
ENV DISPLAY=:99

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
