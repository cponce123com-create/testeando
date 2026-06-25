FROM node:24-slim

# Instalar Python, pip, git, Go y dependencias
RUN apt-get update && 
    apt-get install -y python3 python3-pip python3-venv git golang-go ca-certificates wget && 
    rm -rf /var/lib/apt/lists/*

# Instalar Nettacker
RUN pip3 install --break-system-packages owasp-nettacker

# Instalar Go tools
# Subfinder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && 
    cp ~/go/bin/subfinder /usr/local/bin/

# Titus (descargar binary precompilado)
RUN wget -q https://github.com/praetorian-inc/titus/releases/latest/download/titus-linux-amd64.tar.gz && 
    tar xzf titus-linux-amd64.tar.gz && 
    mv titus /usr/local/bin/ && 
    rm titus-linux-amd64.tar.gz

# Brutus (descargar binary precompilado)
RUN wget -q https://github.com/praetorian-inc/brutus/releases/latest/download/brutus-linux-amd64.tar.gz && 
    tar xzf brutus-linux-amd64.tar.gz && 
    mv brutus /usr/local/bin/ && 
    rm brutus-linux-amd64.tar.gz

WORKDIR /opt/app

# Copiar e instalar dependencias Node
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el código
COPY . .

EXPOSE 10000

CMD ["node", "src/index.js"]
