FROM node:24-slim

# Instalar Python, pip, git y dependencias de compilación para Nettacker
RUN apt-get update && 
    apt-get install -y python3 python3-pip python3-venv git && 
    rm -rf /var/lib/apt/lists/*

# Instalar Nettacker globalmente
RUN pip3 install --break-system-packages owasp-nettacker

WORKDIR /opt/app

# Copiar e instalar dependencias Node
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el código
COPY . .

# Render asigna el puerto via env
EXPOSE 10000

CMD ["node", "src/index.js"]
