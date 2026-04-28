#!/bin/bash
set -e

echo "Desplegando Ayudante Bodeguita..."

# Navegar al directorio de despliegue
cd /opt/ayudante-bodeguita

echo "Instalando dependencias del backend..."
cd backend
npm install
echo "Generando Prisma Client..."
npx prisma generate
echo "Ejecutando migraciones de base de datos..."
npx prisma migrate deploy
echo "Compilando backend..."
npm run build
cd ..

echo "Instalando dependencias del frontend..."
cd frontend
npm install
echo "Compilando frontend..."
npm run build
cd ..

echo "Reiniciando procesos con PM2..."
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "Despliegue finalizado."
