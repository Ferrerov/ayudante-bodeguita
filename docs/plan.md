# Plan de desarrollo

## Objetivo

Construir el MVP de forma incremental, con entregables pequenos, validables y faciles de continuar por futuros agentes IA.

## Alcance de este plan

Este plan cubre:

- preparacion de la base tecnica
- modelo de datos
- imports de productos y listas
- consulta unificada
- frontend inicial
- preparacion de deploy

Este plan no incluye aun:

- integracion con API de Contabilium
- historial de imports
- auditoria persistente
- automatizaciones
- permisos avanzados

## Stack definido

- Backend: `NestJS`
- Frontend: `Next.js`
- ORM: `Prisma`
- Base de datos: `PostgreSQL`
- Lectura de Excel: `xlsx`
- Tabla: libreria liviana compatible con React y Next.js

## Criterios generales

- No sobre-ingenierizar.
- Priorizar claridad del codigo.
- Mantener responsabilidades separadas.
- Validar antes de persistir.
- Usar transacciones en cada import.
- Entregar algo usable al final de cada etapa.

## Orden de ejecucion recomendado

1. Base del proyecto
2. Modelo de datos
3. Import de productos
4. Import de listas
5. Vista unificada
6. Frontend inicial
7. Deploy

## Etapa 1 - Base del proyecto

### Objetivo

Dejar lista la estructura minima para empezar a desarrollar sin ambiguedades.

### Tareas

- Inicializar proyecto backend con `NestJS`.
- Inicializar proyecto frontend con `Next.js`.
- Definir estructura de carpetas inicial.
- Configurar manejo de variables de entorno.
- Configurar scripts base de desarrollo.
- Definir la libreria de tabla a utilizar en frontend.

### Resultado esperado

- Proyecto arranca localmente.
- La estructura es clara para siguientes etapas.

### Criterio de cierre

- Existen proyectos `backend` y `frontend` funcionales.
- Hay una forma estandar de ejecutar ambos entornos.
- El stack elegido queda asentado y sin decisiones tecnicas pendientes para comenzar a desarrollar.

## Etapa 2 - Modelo de datos

### Objetivo

Definir la base de datos del MVP con Prisma y dejarla lista para imports.

### Tareas

- Configurar Prisma en backend.
- Definir schema para `Product`.
- Definir schema para `PriceList`.
- Definir schema para `PriceListItem`.
- Definir indices y restricciones unicas.
- Crear migracion inicial.
- Preparar semilla inicial para `PriceList`.

### Resultado esperado

- Base de datos lista para almacenar catalogo y listas vigentes.

### Criterio de cierre

- Prisma genera cliente sin errores.
- La migracion inicial aplica correctamente.
- Las listas base existen en la base.

## Etapa 3 - Import de productos

### Objetivo

Poder importar el archivo de productos completo y reemplazar el catalogo vigente.

### Tareas

- Implementar endpoint `POST /imports/products`.
- Resolver carga de archivo multipart.
- Leer archivo `.xlsx`.
- Detectar hoja y encabezados.
- Validar columnas obligatorias.
- Parsear filas.
- Normalizar strings y numeros.
- Validar filas y detectar duplicados.
- Construir respuesta de errores legible.
- Reemplazar catalogo en una transaccion.
- Probar el import con el archivo real `docs/ejemplos-archivos/_tmp_Productos_74369_20260427.xlsx`.

### Resultado esperado

- El sistema puede cargar el catalogo vigente desde el Excel real.

### Criterio de cierre

- Un archivo valido importa correctamente.
- Un archivo invalido no modifica datos.
- Los errores se devuelven con suficiente detalle.
- El archivo real de ejemplo se procesa correctamente.

## Etapa 4 - Import de listas de precios

### Objetivo

Poder importar cada lista de precios de forma independiente, siempre sobre un catalogo ya cargado.

### Tareas

- Implementar endpoint `POST /imports/price-lists/bodeguita`.
- Implementar endpoint `POST /imports/price-lists/distribuidora-mayorista`.
- Verificar existencia de catalogo de productos antes de importar.
- Rechazar import si no existe catalogo de productos cargado.
- Leer archivo `.xlsx`.
- Validar columnas obligatorias.
- Parsear filas.
- Normalizar strings y numeros.
- Detectar duplicados.
- Detectar codigos sin producto como advertencias.
- Reemplazar items de la lista en transaccion.
- Devolver resumen con advertencias.
- Probar con los archivos reales:
  - `docs/ejemplos-archivos/_tmp_ListaPrecio_12217_20260427.xlsx`
  - `docs/ejemplos-archivos/_tmp_ListaPrecio_12198_20260427.xlsx`

### Resultado esperado

- Cada lista puede importarse por separado sin afectar la otra.

### Criterio de cierre

- Un import valido reemplaza solo la lista correspondiente.
- Un import sin catalogo previo falla.
- Los codigos huerfanos vuelven como advertencia y no bloquean.
- Los dos archivos reales de ejemplo se procesan correctamente.

## Etapa 5 - Vista unificada

### Objetivo

Exponer una consulta que combine productos y listas para alimentar la tabla principal.

### Tareas

- Implementar endpoint `GET /products/unified`.
- Tomar `Product` como base principal.
- Resolver union con ambas listas.
- Devolver `0` cuando no exista precio en una lista.
- Soportar busqueda principal desde backend por campos clave.
- Soportar filtros basicos desde backend.
- Soportar ordenamiento desde backend.

### Resultado esperado

- El frontend puede consumir una unica fuente de datos ya unificada.

### Criterio de cierre

- La respuesta incluye todos los productos.
- Los precios faltantes se devuelven como `0`.
- Busqueda y ordenamiento funcionan con datos reales.

## Etapa 6 - Frontend inicial

### Objetivo

Construir una interfaz privada minima pero usable para importar y consultar datos.

### Tareas

- Crear pantalla principal.
- Agregar formulario para import de productos.
- Agregar formulario para import de `BODEGUITA`.
- Agregar formulario para import de `DISTRIBUIDORA MAYORISTA`.
- Consumir endpoint de vista unificada.
- Renderizar tabla con columnas clave.
- Agregar busqueda.
- Agregar filtros por columnas.
- Agregar ordenamiento.
- Evaluar paginacion simple si el volumen de datos lo requiere.
- Mostrar errores y advertencias de importacion.

### Resultado esperado

- El usuario puede operar el MVP completo desde la interfaz.

### Criterio de cierre

- Se puede importar y luego visualizar datos sin usar herramientas externas.
- La tabla es util para el trabajo diario.

## Etapa 7 - Preparacion de deploy

### Objetivo

Dejar la aplicacion lista para desplegarse en Oracle VPS con configuracion minima y reproducible.

### Tareas

- Revisar variables de entorno finales.
- Definir comandos de build.
- Definir comandos de arranque.
- Preparar migraciones para entorno servidor.
- Configurar procesos con `pm2`.
- Validar estructura de despliegue en `/opt/ayudante-bodeguita`.

### Resultado esperado

- Existe una ruta clara para pasar de desarrollo local a servidor.

### Criterio de cierre

- Hay comandos definidos para instalar, migrar, buildar y arrancar.
- La documentacion de deploy coincide con la implementacion.

## Riesgos y puntos de atencion

- Los archivos reales pueden cambiar encabezados en futuras exportaciones.
- Los formatos numericos pueden variar entre coma y punto decimal.
- Un archivo incompleto reemplaza el estado vigente completo de ese tipo.
- Las listas reales ya contienen algunos codigos sin producto, por lo que el sistema debe tratarlos como advertencia.

## Propuesta de prioridad practica

Si queremos maximizar valor rapido, la secuencia ideal es:

1. Backend base + Prisma
2. Import de productos
3. Import de listas
4. Vista unificada
5. Frontend
6. Deploy

## Nota de trabajo

Antes de comenzar la implementacion conviene revisar este plan y ajustarlo si cambian reglas de negocio o criterios de validacion.
