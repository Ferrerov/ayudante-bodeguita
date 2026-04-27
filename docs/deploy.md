# Ayudante Bodeguita - Deploy

## Objetivo

Definir una guia simple de despliegue para el MVP en Oracle VPS.

## Entorno objetivo

- Servidor: Oracle VPS
- Usuario: `ubuntu`
- Directorio de despliegue: `/opt/ayudante-bodeguita`
- Gestor de procesos: `pm2`
- Base de datos: PostgreSQL

## Alcance del deploy del MVP

El deploy debera contemplar:

- backend Node.js
- frontend web
- conexion a PostgreSQL
- variables de entorno
- procesos administrados con `pm2`

## Estructura esperada en servidor

Ruta base:

- `/opt/ayudante-bodeguita`

Subdirectorios esperados:

- `/opt/ayudante-bodeguita/backend`
- `/opt/ayudante-bodeguita/frontend`

## Requisitos de infraestructura

- Node.js instalado en servidor
- PostgreSQL disponible
- `pm2` instalado globalmente
- acceso del usuario `ubuntu` con permisos suficientes

## Variables de entorno esperadas

Se definiran durante la implementacion, pero como minimo se espera:

- conexion a base de datos
- puerto de backend
- configuracion de frontend
- modo de entorno

## Flujo de despliegue previsto

1. Obtener codigo fuente en `/opt/ayudante-bodeguita`.
2. Instalar dependencias de backend y frontend.
3. Configurar variables de entorno.
4. Ejecutar migraciones de Prisma.
5. Generar cliente Prisma.
6. Compilar frontend si aplica.
7. Iniciar procesos con `pm2`.
8. Verificar disponibilidad de backend y frontend.

## Procesos esperados

Se preve mantener al menos:

- un proceso para backend
- un proceso para frontend o servidor web asociado

## Pendientes para la etapa de implementacion

- elegir framework exacto de backend
- elegir framework exacto de frontend
- definir puertos
- definir estrategia de proxy reverso si aplica
- definir manejo de SSL si aplica
- escribir comandos reales de build y arranque

## Nota

Este documento deja la guia base de despliegue, pero no ejecuta ninguna accion de infraestructura todavia.
