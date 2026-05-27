# =========================================================
# CYMOR MOVIE HUB — DOCKERFILE v5.1
# ✅ Fixed Python path mismatch between stages
# ✅ Supervisor runs Node + Python together
# ✅ Render Free Tier optimized
# =========================================================

# --- Stage 1: Install Python dependencies ---
FROM python:3.11-slim AS python-build

WORKDIR /app/backend

# Copy and install Python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Final image (Node + Python + Supervisor) ---
FROM node:18-slim

WORKDIR /app

# Install Python 3.11 + pip + supervisor
# Using 3.11 to match Stage 1 exactly
RUN apt-get update && \
    apt-get install -y \
        python3.11 \
        python3-pip \
        python3.11-venv \
        supervisor \
        --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Make python3 and pip3 point to 3.11
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python python3 /usr/bin/python3.11 1

# Copy Python packages from Stage 1 into the correct 3.11 site-packages path
COPY --from=python-build /usr/local/lib/python3.11/site-packages \
                          /usr/local/lib/python3.11/dist-packages

# Copy Python CLI entry points (e.g. uvicorn, fastapi commands)
COPY --from=python-build /usr/local/bin /usr/local/bin

# Copy backend source code
COPY backend /app/backend

# Copy frontend source code
COPY frontend /app/frontend

# Install Node.js dependencies for the frontend
WORKDIR /app/frontend
RUN npm install --omit=dev

# --- Supervisor config ---
# Runs both python backend and node frontend in one container
RUN mkdir -p /etc/supervisor/conf.d && \
    printf "\
[supervisord]\n\
nodaemon=true\n\
logfile=/var/log/supervisord.log\n\
logfile_maxbytes=10MB\n\
loglevel=info\n\
\n\
[program:python_engine]\n\
command=python3 /app/backend/app.py\n\
directory=/app/backend\n\
autostart=true\n\
autorestart=true\n\
startretries=5\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:node_server]\n\
command=node /app/frontend/server.js\n\
directory=/app/frontend\n\
autostart=true\n\
autorestart=true\n\
startretries=5\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
" > /etc/supervisor/conf.d/supervisord.conf

# Render listens on one port — Node.js handles all HTTP traffic
EXPOSE 3000

# Launch both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
