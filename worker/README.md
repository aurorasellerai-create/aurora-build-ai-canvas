# Aurora Build AI — AAB Worker

Worker Node.js que processa jobs de conversão Link → AAB.

## Requisitos do Servidor

- **OS**: Ubuntu 22.04+ (ou qualquer Linux)
- **RAM**: mínimo 4GB (recomendado 8GB)
- **Disco**: 20GB+ livre
- **Node.js**: 18+
- **Java**: JDK 17 (para Gradle)
- **Android SDK**: Command Line Tools + Build Tools 34

## Setup Rápido

```bash
# 1. Instalar dependências do sistema
sudo apt update && sudo apt install -y openjdk-17-jdk unzip wget curl

# 2. Instalar Android SDK
export ANDROID_HOME=$HOME/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
cd /tmp
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Aceitar licenças
yes | sdkmanager --licenses
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# 3. Instalar Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# 4. Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 5. Setup do Worker
cd /opt/aurora-worker
npm install

# 6. Configurar .env
cp .env.example .env
# Editar .env com suas credenciais

# 7. Iniciar
npm start
```

## Variáveis de Ambiente (.env)

```env
SUPABASE_URL=https://awzjahcnjxaehybilcmo.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
REDIS_URL=redis://127.0.0.1:6379
ANDROID_HOME=/root/android-sdk
PORT=3333
WORKER_SECRET=sua_chave_secreta_para_webhook
```

## Arquitetura

```
Edge Function (Supabase)
  → POST /webhook/convert (neste worker)
    → BullMQ Queue
      → Worker processa:
        1. Criar projeto Capacitor
        2. Injetar URL no WebView
        3. Configurar app (nome, ícone, splash)
        4. npx cap add android
        5. ./gradlew bundleRelease
        6. Upload AAB para Supabase Storage
        7. Atualizar conversion_jobs (status=done, download_url)
```

## Rodando com PM2 (produção)

```bash
npm install -g pm2
pm2 start npm --name "aurora-worker" -- start
pm2 save
pm2 startup
```
