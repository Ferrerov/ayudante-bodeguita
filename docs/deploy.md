# Ayudante Bodeguita - Deploy en Oracle VPS

Guia paso a paso para instalar, validar y publicar el MVP en una VPS Ubuntu, desde el acceso por SSH hasta ingresar desde una IP publica.

Stack desplegado:

- Backend NestJS en `127.0.0.1:3001`
- Frontend Next.js en `127.0.0.1:3000`
- PostgreSQL local
- PM2 como gestor de procesos
- Nginx como reverse proxy publico en `http://IP_PUBLICA`

Repositorio esperado:

- `https://github.com/Ferrerov/ayudante-bodeguita.git`

Ruta esperada en servidor:

- `/opt/ayudante-bodeguita`

> En los comandos, reemplazar `IP_PUBLICA` y `PASSWORD_SEGURA_DB` por valores reales.

## 1. Entrar al servidor por SSH

Desde tu maquina local:

```bash
ssh ubuntu@IP_PUBLICA
```

Si usas una clave privada especifica:

```bash
ssh -i /ruta/a/tu-clave.pem ubuntu@IP_PUBLICA
```

Validar que estas dentro del servidor:

```bash
whoami
hostname
pwd
```

Resultado esperado:

- `whoami` debe devolver `ubuntu`.
- `pwd` normalmente debe estar en `/home/ubuntu`.

Si no conecta:

- Verificar que la IP sea la IP publica correcta de la VPS.
- Verificar que la regla de ingreso SSH/TCP `22` este abierta en Oracle Cloud.
- Verificar permisos de la clave: `chmod 600 /ruta/a/tu-clave.pem`.
- Verificar que el usuario sea `ubuntu`.

## 2. Actualizar el sistema base

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx postgresql postgresql-contrib
```

Validar instalaciones:

```bash
git --version
curl --version
nginx -v
psql --version
```

Si algun comando no existe, repetir la instalacion:

```bash
sudo apt install -y curl git build-essential nginx postgresql postgresql-contrib
```

## 3. Instalar Node.js

Usar Node.js 20 LTS o superior. Next.js 16 requiere una version moderna de Node.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Validar:

```bash
node --version
npm --version
```

Resultado esperado:

- `node --version` debe mostrar `v20.x` o superior.
- `npm --version` debe mostrar una version instalada.

Si Node queda en una version vieja:

```bash
sudo apt remove -y nodejs
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

## 4. Instalar PM2

```bash
sudo npm install -g pm2
```

Validar:

```bash
pm2 --version
```

Si `pm2` no aparece, cerrar y volver a entrar por SSH, o ejecutar:

```bash
sudo npm install -g pm2
```

## 5. Preparar PostgreSQL

Validar que PostgreSQL este activo:

```bash
sudo systemctl status postgresql --no-pager
```

Si no esta activo:

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager
```

Crear usuario y base si no existen:

```bash
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'ayudante';" | grep -q 1 || sudo -u postgres psql -c "CREATE USER ayudante WITH PASSWORD 'PASSWORD_SEGURA_DB';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'ayudante_bodeguita';" | grep -q 1 || sudo -u postgres createdb -O ayudante ayudante_bodeguita
```

Validar base y usuario:

```bash
sudo -u postgres psql -c "\du"
sudo -u postgres psql -c "\l"
```

Probar conexion como usuario de la app:

```bash
PGPASSWORD='PASSWORD_SEGURA_DB' psql -h 127.0.0.1 -U ayudante -d ayudante_bodeguita -c "SELECT 1;"
```

Resultado esperado:

- Debe devolver una fila con `1`.

Si falla por password:

```bash
sudo -u postgres psql -c "ALTER USER ayudante WITH PASSWORD 'PASSWORD_SEGURA_DB';"
```

Si falla porque la base no existe:

```bash
sudo -u postgres createdb -O ayudante ayudante_bodeguita
```

## 6. Crear ruta de despliegue

Validar si existe:

```bash
ls -ld /opt/ayudante-bodeguita
```

Si no existe:

```bash
sudo mkdir -p /opt/ayudante-bodeguita
sudo chown -R ubuntu:ubuntu /opt/ayudante-bodeguita
```

Validar permisos:

```bash
ls -ld /opt/ayudante-bodeguita
```

Debe figurar como propiedad de `ubuntu`.

## 7. Bajar o actualizar el proyecto

Si la carpeta ya existe y es el repo:

```bash
cd /opt/ayudante-bodeguita
git status
git pull
```

Si la carpeta no existe:

```bash
cd /opt
git clone https://github.com/Ferrerov/ayudante-bodeguita.git /opt/ayudante-bodeguita
cd /opt/ayudante-bodeguita
```

Si la carpeta existe pero no es un repo Git, no la borres sin revisar. Moverla a backup y clonar limpio:

```bash
sudo mv /opt/ayudante-bodeguita "/opt/ayudante-bodeguita.backup.$(date +%Y%m%d%H%M%S)"
git clone https://github.com/Ferrerov/ayudante-bodeguita.git /opt/ayudante-bodeguita
cd /opt/ayudante-bodeguita
```

Validar estructura:

```bash
ls
ls backend frontend docs
```

Resultado esperado:

- Deben existir `backend`, `frontend`, `docs`, `deploy.sh`, `ecosystem.config.js`.

Si `git pull` falla por cambios locales:

- Revisar con `git status`.
- Si esos cambios son importantes, guardarlos antes.
- Si son cambios descartables hechos en servidor, resolver manualmente antes de continuar.

## 8. Configurar variables de entorno

Backend:

```bash
cd /opt/ayudante-bodeguita/backend
nano .env
```

Contenido:

```env
DATABASE_URL="postgresql://ayudante:PASSWORD_SEGURA_DB@127.0.0.1:5432/ayudante_bodeguita?schema=public"
PORT=3001
FRONTEND_URL="http://IP_PUBLICA"
NODE_ENV=production
```

Frontend:

```bash
cd /opt/ayudante-bodeguita/frontend
nano .env.production
```

Contenido:

```env
NEXT_PUBLIC_API_URL="http://IP_PUBLICA/api"
```

Validar archivos:

```bash
cd /opt/ayudante-bodeguita
test -f backend/.env && echo "backend/.env OK"
test -f frontend/.env.production && echo "frontend/.env.production OK"
```

Importante:

- `NEXT_PUBLIC_API_URL` se lee al compilar frontend. Si cambia, hay que volver a ejecutar `npm run build` en `frontend`.
- Si usas dominio en vez de IP, reemplazar `http://IP_PUBLICA` por `https://tu-dominio.com` cuando ya exista SSL.

## 9. Instalar dependencias

Backend:

```bash
cd /opt/ayudante-bodeguita/backend
npm install
```

Frontend:

```bash
cd /opt/ayudante-bodeguita/frontend
npm install
```

Validar:

```bash
test -d /opt/ayudante-bodeguita/backend/node_modules && echo "backend deps OK"
test -d /opt/ayudante-bodeguita/frontend/node_modules && echo "frontend deps OK"
```

Si falla `npm install`:

- Verificar internet desde el servidor: `curl -I https://registry.npmjs.org`
- Verificar Node/npm: `node --version && npm --version`
- Reintentar dentro de la carpeta que fallo.

## 10. Generar Prisma, migrar y sembrar listas

```bash
cd /opt/ayudante-bodeguita/backend
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

Validar migraciones:

```bash
npx prisma migrate status
```

Validar tablas y listas base:

```bash
PGPASSWORD='PASSWORD_SEGURA_DB' psql -h 127.0.0.1 -U ayudante -d ayudante_bodeguita -c "\dt"
PGPASSWORD='PASSWORD_SEGURA_DB' psql -h 127.0.0.1 -U ayudante -d ayudante_bodeguita -c "SELECT code, name FROM price_lists ORDER BY code;"
```

Resultado esperado:

- Tablas: `products`, `price_lists`, `price_list_items`.
- Listas: `BODEGUITA`, `DISTRIBUIDORA_MAYORISTA`.

Si falla por `DATABASE_URL`:

- Revisar `backend/.env`.
- Probar la conexion del paso 5.

Si faltan las listas:

```bash
cd /opt/ayudante-bodeguita/backend
npm run db:seed
```

## 11. Compilar backend y frontend

Backend:

```bash
cd /opt/ayudante-bodeguita/backend
npm run build
```

Validar:

```bash
test -d dist && echo "backend build OK"
```

Frontend:

```bash
cd /opt/ayudante-bodeguita/frontend
npm run build
```

Validar:

```bash
test -d .next && echo "frontend build OK"
```

Si falla el build del frontend despues de cambiar `NEXT_PUBLIC_API_URL`, revisar `frontend/.env.production` y volver a compilar.

## 12. Levantar procesos con PM2

```bash
cd /opt/ayudante-bodeguita
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

El comando `pm2 startup` imprime otro comando con `sudo env ...`. Copiarlo y ejecutarlo para que PM2 arranque al reiniciar la VPS.

Validar procesos:

```bash
pm2 status
pm2 logs bodeguita-backend --lines 50
pm2 logs bodeguita-frontend --lines 50
```

Resultado esperado:

- `bodeguita-backend` en estado `online`.
- `bodeguita-frontend` en estado `online`.

Si un proceso esta en error:

```bash
pm2 logs NOMBRE_DEL_PROCESO --lines 100
```

Correcciones frecuentes:

- Backend falla por DB: revisar `backend/.env`, PostgreSQL y migraciones.
- Frontend falla por falta de build: ejecutar `cd frontend && npm run build`.
- PM2 no encuentra carpetas: ejecutar `pm2 delete all`, volver a `cd /opt/ayudante-bodeguita` y repetir `pm2 start ecosystem.config.js`.

## 13. Validar servicios internos

Backend:

```bash
curl -i http://127.0.0.1:3001/products/unified
```

Resultado esperado:

- HTTP `200`.
- JSON con `data`, `total`, `page`, `limit`, `totalPages`.

Frontend:

```bash
curl -I http://127.0.0.1:3000
```

Resultado esperado:

- HTTP `200` o una respuesta valida de Next.js.

Si backend no responde:

```bash
pm2 logs bodeguita-backend --lines 100
sudo systemctl status postgresql --no-pager
```

Si frontend no responde:

```bash
pm2 logs bodeguita-frontend --lines 100
```

## 14. Configurar Nginx para acceso publico por IP

Crear configuracion:

```bash
sudo nano /etc/nginx/sites-available/ayudante-bodeguita
```

Contenido:

```nginx
server {
    listen 80;
    server_name IP_PUBLICA;

    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar sitio:

```bash
sudo ln -sf /etc/nginx/sites-available/ayudante-bodeguita /etc/nginx/sites-enabled/ayudante-bodeguita
sudo nginx -t
sudo systemctl reload nginx
```

Validar Nginx:

```bash
sudo systemctl status nginx --no-pager
curl -I http://127.0.0.1
curl -i http://127.0.0.1/api/products/unified
```

Resultado esperado:

- `nginx -t` debe decir `syntax is ok` y `test is successful`.
- `/` debe responder desde frontend.
- `/api/products/unified` debe responder desde backend.

Si `nginx -t` falla:

- Revisar llaves, punto y coma y que `server_name` tenga la IP correcta.
- Reabrir el archivo y corregir.

Si `/api/products/unified` devuelve 404:

- Verificar que `location /api/` tenga `proxy_pass http://127.0.0.1:3001/;` con barra final.

## 15. Abrir acceso externo

En la VPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

En Oracle Cloud:

- Abrir regla de ingreso TCP `80` hacia la instancia.
- Mantener TCP `22` abierto solo para administracion SSH.
- No hace falta exponer `3000` ni `3001` si Nginx esta funcionando.

Validar desde tu maquina local, fuera de la VPS:

```bash
curl -I http://IP_PUBLICA
curl -i http://IP_PUBLICA/api/products/unified
```

Luego abrir en navegador:

```text
http://IP_PUBLICA
```

Si desde la VPS funciona pero desde afuera no:

- Revisar Security List o Network Security Group de Oracle.
- Revisar `sudo ufw status`.
- Revisar que Nginx escuche en puerto 80: `sudo ss -tulpn | grep ':80'`.

## 16. Prueba funcional desde navegador

Entrar a:

```text
http://IP_PUBLICA
```

Validaciones:

1. La pantalla debe mostrar `Ayudante Bodeguita`.
2. La seccion `Importaciones` debe mostrar tres cards: Productos, Lista Bodeguita, Lista Distribuidora Mayorista.
3. La seccion `Catalogo` debe cargar sin error. Si no hay datos, es correcto que muestre estado vacio.
4. Abrir DevTools del navegador y verificar que las llamadas API vayan a `http://IP_PUBLICA/api/...`.

Orden recomendado de primera carga de datos:

1. Importar Excel de productos.
2. Importar lista Bodeguita.
3. Importar lista Distribuidora Mayorista.
4. Revisar `Catalogo`, `Costos y precios` y `Codigos de productos`.

Si las importaciones fallan por tamaño:

- Revisar que Nginx tenga `client_max_body_size 25m`.
- Recargar Nginx: `sudo systemctl reload nginx`.

Si el frontend intenta llamar a `localhost:3001` desde tu navegador:

- Corregir `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL="http://IP_PUBLICA/api"
```

- Recompilar y reiniciar:

```bash
cd /opt/ayudante-bodeguita/frontend
npm run build
cd /opt/ayudante-bodeguita
pm2 restart bodeguita-frontend
```

## 17. Comandos de mantenimiento

Actualizar codigo y redeploy:

```bash
cd /opt/ayudante-bodeguita
git pull
chmod +x deploy.sh
./deploy.sh
pm2 status
```

Ver logs:

```bash
pm2 logs bodeguita-backend --lines 100
pm2 logs bodeguita-frontend --lines 100
```

Reiniciar procesos:

```bash
pm2 restart bodeguita-backend
pm2 restart bodeguita-frontend
```

Ver estado de DB:

```bash
sudo systemctl status postgresql --no-pager
PGPASSWORD='PASSWORD_SEGURA_DB' psql -h 127.0.0.1 -U ayudante -d ayudante_bodeguita -c "SELECT COUNT(*) FROM products;"
```

Ver estado de Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

## 18. Checklist final

- SSH entra correctamente como `ubuntu`.
- `/opt/ayudante-bodeguita` existe y contiene el repo.
- `node --version` muestra Node 20 o superior.
- `pm2 status` muestra backend y frontend `online`.
- PostgreSQL esta activo.
- `price_lists` contiene `BODEGUITA` y `DISTRIBUIDORA_MAYORISTA`.
- `curl http://127.0.0.1:3001/products/unified` responde JSON.
- `curl http://127.0.0.1:3000` responde frontend.
- `sudo nginx -t` pasa correctamente.
- `curl http://127.0.0.1/api/products/unified` responde JSON.
- `http://IP_PUBLICA` abre desde una maquina externa.
