# ===== Build-Stage =====
FROM node:20-bullseye AS build

# Arbeitsverzeichnis
WORKDIR /app

# Systemabhängige Build-Tools für node-gyp und Audio installieren
RUN apt-get update && \
    apt-get install -y \
    python3 \
    make \
    build-essential \
    git \
    libasound2-dev \
    libpulse-dev \
    libmpg123-dev \
    && rm -rf /var/lib/apt/lists/*

# Node-Module kopieren und installieren
COPY package*.json ./
RUN npm install

# App-Code kopieren
COPY . .

# TypeScript nach dist/ uebersetzen (dist/ ist nicht im Repository)
RUN npm run build

# ===== Run-Stage =====
FROM node:20-bullseye

WORKDIR /app

# Runtime Audio-Dependencies
RUN apt-get update && \
    apt-get install -y \
    libasound2 \
    libpulse0 \
    libmpg123-0 \
    && rm -rf /var/lib/apt/lists/*

# App und node_modules kopieren
COPY --from=build /app /app

# Um Pulseaudio vom Host nutzen zu können
ENV PULSE_SERVER=unix:${XDG_RUNTIME_DIR}/pulse/native
ENV DISPLAY=:0

# Serielles Gerät forwarden (z.B. /dev/ttyUSB0)
VOLUME ["/dev"]

# Startbefehl
CMD ["node", "dist/index.js"]
