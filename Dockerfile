FROM node:18-slim

RUN apt-get update && \
    apt-get install -y git git-lfs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone repo with full LFS support
RUN git lfs install && \
    git clone https://github.com/Noble200/allva-updates-server.git . && \
    git lfs pull

RUN npm ci --omit=dev

EXPOSE 8000
CMD ["node", "server.js"]
