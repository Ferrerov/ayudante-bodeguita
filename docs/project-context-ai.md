# Contexto para agentes IA - Ayudante Bodeguita

Documento compacto para que agentes IA entiendan el proyecto sin releer todo el repositorio. Mantenerlo actualizado cuando cambien reglas de negocio, endpoints, modelos o secciones de UI.

## Resumen ejecutivo

Ayudante Bodeguita es una web app privada de uso interno para operar datos exportados manualmente desde Contabilium. El MVP no usa API de Contabilium: la fuente de verdad son archivos Excel importados por el usuario. La app persiste el estado vigente del catalogo y de dos listas de precios, y luego ofrece vistas de consulta, control de margenes y revision de codigos SKU.

Principio central: cada importacion reemplaza completamente el estado vigente de su tipo. Importar productos reemplaza todo `Product`; importar una lista reemplaza solo los items de esa lista. No hay historial, auditoria ni almacenamiento de archivos originales en el MVP.

## Estructura del repo

- `backend/`: API REST NestJS, Prisma ORM, PostgreSQL, lectura de Excel con `xlsx`.
- `frontend/`: Next.js App Router, UI privada con importaciones y tablas operativas.
- `docs/`: decisiones de producto, arquitectura, plan, deploy, ejemplos Excel y este contexto.
- `docker-compose.yml`: PostgreSQL local en puerto host `5433`.
- `ecosystem.config.js`: procesos PM2 esperados para backend y frontend.
- `deploy.sh`: flujo basico de deploy en `/opt/ayudante-bodeguita`.

## Documentos existentes

- `docs/product.md`: alcance funcional del MVP, reglas de importacion, errores bloqueantes, advertencias y campos reales observados.
- `docs/architecture.md`: arquitectura esperada, modelo de datos, estrategia transaccional, endpoints propuestos.
- `docs/plan.md`: etapas incrementales del desarrollo.
- `docs/deploy.md`: objetivo de deploy en Oracle VPS, PM2 y PostgreSQL.
- `docs/ejemplos-archivos/`: archivos reales de referencia:
  - productos: `_tmp_Productos_74369_20260427.xlsx`
  - lista DISTRIBUIDORA MAYORISTA: `_tmp_ListaPrecio_12198_20260427.xlsx`
  - lista BODEGUITA: `_tmp_ListaPrecio_12217_20260427.xlsx`

## Stack y ejecucion

Backend:
- NestJS 11, TypeScript, Prisma 7 con `@prisma/adapter-pg`, PostgreSQL, `xlsx`, Multer.
- Scripts relevantes en `backend/package.json`: `start:dev`, `build`, `start:prod`, `db:migrate`, `db:seed`, `db:generate`, `test`.
- Requiere `DATABASE_URL`. El servicio Prisma crea un `pg.Pool` y adapter PrismaPg.
- Puerto por defecto: `3001`.
- CORS permite `FRONTEND_URL` o `http://localhost:3000`.

Frontend:
- Next.js 16, React 19, TypeScript.
- Scripts relevantes en `frontend/package.json`: `dev`, `build`, `start`, `lint`.
- API base: `NEXT_PUBLIC_API_URL` o `http://localhost:3001`.
- Nota importante: `frontend/AGENTS.md` advierte que Next.js 16 puede diferir de conocimiento previo; revisar docs locales de Next antes de cambios grandes.

Infra local:
- `docker-compose.yml` levanta `ayudante-bodeguita-db` con DB `ayudante_bodeguita`, usuario/password `postgres/postgres`, host port `5433`.

## Modelo de datos

Definido en `backend/prisma/schema.prisma` y migracion inicial.

`Product` (`products`):
- Catalogo vigente importado desde Excel de productos.
- `sku` es unico y texto, aunque parezca numerico.
- Campos principales: `type`, `parentSku`, `name`, atributos/variantes, `barcode`, `oemCode`, `description`, `status`, `currency`, costos/precios base, IVA, precio final, rentabilidad, stock, stock reservado/disponible/minimo, visibilidad, rubro/subrubro, proveedor, observaciones y cuentas contables.
- Numericos se guardan como `Decimal`; la API los convierte a `number`.
- Se importan activos e inactivos. Tipos validos actuales: `Producto`, `Combo`, `Servicio`.

`PriceList` (`price_lists`):
- Listas fijas del sistema.
- Codigos esperados por seed: `BODEGUITA` y `DISTRIBUIDORA_MAYORISTA`.
- `backend/prisma/seed.ts` hace upsert de ambas.

`PriceListItem` (`price_list_items`):
- Precio vigente de un SKU dentro de una lista.
- Relaciona con `PriceList` por `priceListId`; `onDelete: Cascade`.
- `sku` es texto y no tiene FK a `Product` porque se permiten codigos huerfanos como advertencia.
- Unicidad: `[priceListId, sku]`.

## Reglas de importacion

Implementacion principal: `backend/src/imports/imports.service.ts`; utilidades Excel: `backend/src/imports/xlsx.utils.ts`; endpoints: `backend/src/imports/imports.controller.ts`.

Reglas generales:
- Se toma la primera hoja del Excel.
- `parseXlsx` convierte la hoja a filas JSON con `defval: ''`.
- Columnas requeridas se comparan por nombre exacto tras `trim`.
- Strings se normalizan con trim, no se cambia mayuscula/minuscula.
- Numeros aceptan coma o punto decimal; vacio se interpreta como `0`; no numerico devuelve `null` y puede bloquear.
- Booleanos aceptan `si`, `sí`, `true`, `1`; otros valores quedan `false`.
- Si hay errores por fila, el servicio retorna `errors` y no persiste cambios.
- Cuando no hay errores, se usa transaccion Prisma: borrar estado vigente e insertar datos nuevos.

Import productos `POST /imports/products`:
- Recibe multipart `file`, `.xlsx` o `.xls`.
- Columnas obligatorias: `Tipo`, `SKU`, `Nombre`, `Estado`, `Costo Interno`, `Precio Final`, `Stock`, `Stock Reservado`, `Stock Disponible`, `Visible En Ventas`, `Rubro`, `Sub Rubro`.
- Bloquea: SKU vacio, nombre vacio, tipo fuera de conjunto permitido, SKU duplicado, numericos requeridos invalidos.
- Persiste todos los productos validos y elimina el catalogo anterior con `deleteMany`.

Import listas `POST /imports/price-lists/bodeguita` y `POST /imports/price-lists/distribuidora-mayorista`:
- Requiere que exista al menos un producto cargado.
- Busca `PriceList` por codigo fijo.
- Columnas obligatorias: `Codigo`, `Nombre`, `Precio Final`.
- Bloquea: codigo vacio, nombre vacio, precio final invalido, codigo duplicado, lista inexistente, catalogo vacio.
- Advierte pero no bloquea: codigo no existe en productos; nombre difiere entre lista y producto.
- Reemplaza solo los items de la lista importada.

Respuesta de import:
- `{ type, filename, rowsRead, rowsImported, warnings, errors }`.

## Endpoints de consulta y logica

Implementacion: `backend/src/products/products.service.ts`; controlador: `backend/src/products/products.controller.ts`.

`GET /products/unified`:
- Base de consulta: `Product`.
- Query params: `search`, `category`, `subcategory`, `type`, `status`, `sortBy`, `sortOrder`, `page`, `limit`.
- Busca en `sku`, `name`, `barcode`, `category`, `subcategory`.
- Filtros exactos case-insensitive para rubro, subrubro, tipo y estado.
- Orden backend permitido por `sku`, `name`, `type`, `status`, `internalCost`, `finalPrice`, `stock`, `category`, `subcategory`; default `sku asc`.
- Pagina con default `page=1`, `limit=50`.
- Une en memoria precios de `BODEGUITA` y `DISTRIBUIDORA_MAYORISTA`; si falta item, devuelve `0`.
- Devuelve `{ data, total, page, limit, totalPages }`.

`GET /products/filters`:
- Devuelve valores distintos para selects: `categories`, `subcategories`, `types`, `statuses`.

`GET /products/sku-codes?ruleId=`:
- Calcula disponibilidad de SKUs numericos por rangos hardcodeados y productos fuera de rango.
- Rangos actuales:
  - 1 CERVEZAS: 100-199
  - 2 APERITIVOS: 200-299
  - 3 ESPUMANTES Y CHAMPAGNE: 300-399
  - 4 GASEOSAS, ENERGIZANTES, AGUAS Y JUGOS: 400-499
  - 5 WHISKY: 500-599
  - 6 GIN: 600-699
  - 7 VODKA: 700-799
  - 8 RON, TEQUILA Y LICORES: 800-899
  - 9 PROMOS Y COMBOS: 900-999
  - 10 VINOS: 1000-1999
  - 20 REGALERIA Y MERCHANDISING: 2000-2999
- `resolveRuleByCategory` infiere el rango esperado por texto del rubro, normalizando acentos y mayusculas.
- Mismatches posibles: `NON_NUMERIC_SKU`, `OUT_OF_RANGE`, `UNKNOWN_CATEGORY`.

Endpoints auxiliares para revision de compras:
- `POST /imports/purchase-review/text`: recibe JSON `{ text }`, parsea tabla pegada.
- `POST /imports/purchase-review/file`: recibe `.xlsx`, `.xls` o `.csv`.
- No persisten datos; solo normalizan filas para comparar costos contra precios actuales.
- Detectan encabezados flexibles por nombres normalizados: SKU/codigo, nombre/descripcion/producto, costo/precio/precio final, cantidad opcional.
- Omite filas sin SKU y sin nombre como warning; omite ajuste de redondeo; costo <= 0 o invalido es error.

## Frontend y secciones

Punto de entrada: `frontend/src/app/page.tsx`.
Cliente API y tipos: `frontend/src/lib/api.ts`.
Estilos globales: `frontend/src/app/globals.css`.

La app tiene header fijo y tabs internas:

`Importaciones`:
- Renderiza tres `ImportCard`: Productos, Lista Bodeguita, Lista Distribuidora Mayorista.
- Cada card permite seleccionar Excel y ejecutar endpoint correspondiente.
- Muestra resultado exitoso, errores bloqueantes y warnings.
- Importar con errores no limpia el archivo seleccionado; import exitoso si limpia.

`Catalogo`:
- Componente `ProductsTable`.
- Consume `/products/unified` y `/products/filters`.
- Busca con debounce 400 ms.
- Filtros por tipo, estado, rubro y subrubro.
- Ordena columnas soportadas por backend.
- Muestra columnas operativas: SKU, nombre, tipo, estado, rubro, subrubro, costo, precio final, precio Bodeguita, precio Distribuidora, stock y disponible.
- Paginacion de 50.

`Costos y precios`:
- Componente `CostsPricesTable`.
- Carga todos los productos unificados en paginas de 500 para poder ordenar/filtrar en cliente por margenes calculados.
- Margen = `(precio - costo) / costo * 100`; si costo <= 0, `N/D`.
- Semaforos:
  - Bodeguita: verde >= 40%, naranja >= 30%, rojo < 30%.
  - Distribuidora: verde >= 25%, naranja >= 15%, rojo < 15%.
- Permite buscar, filtrar por bandas de margen, ordenar por costo/precios/margenes/stock y paginar en cliente.
- Revision de compra: el usuario pega una tabla o importa archivo; se compara por SKU o nombre contra productos actuales.
- Sugiere precios redondeados a multiplos de 50: Bodeguita `costo * 1.45`, Distribuidora `costo * 1.25`.

`Codigos de productos`:
- Componente `ProductSkuCodesSection`.
- Consume `/products/sku-codes`.
- Muestra SKUs libres por rango/rubro y productos cuyo SKU no coincide con la regla esperada.
- Puede filtrar por `ruleId`.

## Intencion de producto por seccion

- Importaciones: cargar estado vigente desde exportaciones manuales y validar antes de destruir datos previos.
- Catalogo: dar una vista unica y consultable del estado operativo actual, incluyendo productos sin precio en listas.
- Costos y precios: ayudar a decidir ajustes de precios y detectar margenes bajos usando costos actuales o una compra nueva.
- Codigos de productos: mantener disciplina en numeracion de SKU por rubro y encontrar codigos libres para altas nuevas.

## Contratos y detalles importantes para cambios futuros

- La fuente de verdad del MVP es la base actual despues de imports, no los archivos.
- No agregar historial, auditoria, roles, API Contabilium o almacenamiento de archivos sin revisar alcance.
- Los imports deben seguir siendo transaccionales y de reemplazo completo.
- `PriceListItem.sku` no debe forzarse como FK a `Product` mientras se quiera aceptar codigos huerfanos con warnings.
- Los precios `0` son validos y deben mostrarse, no ocultarse.
- Los codigos/SKUs deben mantenerse como texto.
- Cambios en encabezados Excel reales pueden romper imports porque la validacion es exacta.
- Hay mojibake visible en algunos textos fuente/outputs (`vacÃ­o`, `CatÃ¡logo`, etc.). Si se corrige, hacerlo de forma deliberada y completa, cuidando encoding UTF-8.
- El frontend usa CSS global y clases compartidas; cambios visuales pueden afectar varias secciones.
- `@tanstack/react-table` esta instalado pero las tablas actuales son HTML manual.

## Riesgos conocidos

- Importar un archivo incompleto pero estructuralmente valido reemplaza el estado vigente completo.
- El parser CSV de revision de compras usa split simple por delimitador, no un parser CSV robusto.
- Insertar productos/items fila por fila dentro de transacciones es claro pero puede ser lento con volumen grande.
- `parseDecimal('')` devuelve `0`, por lo que algunos campos requeridos vacios se aceptan como cero.
- Ordenar por precios de listas en `ProductsTable` no esta soportado por backend; en `CostsPricesTable` se hace en cliente.
- El calculo de rango SKU usa `parseInt`, por lo que SKUs con prefijos numericos podrian considerarse numericos parcialmente.

## Comandos utiles

Desde raiz:
- DB local: `docker compose up -d`

Backend:
- Instalar: `cd backend && npm install`
- Migrar dev: `npm run db:migrate`
- Seed listas: `npm run db:seed`
- Dev: `npm run start:dev`
- Build: `npm run build`

Frontend:
- Instalar: `cd frontend && npm install`
- Dev: `npm run dev`
- Build: `npm run build`

Deploy previsto:
- `deploy.sh` instala dependencias, genera Prisma client, corre `prisma migrate deploy`, compila backend/frontend y recarga PM2.
