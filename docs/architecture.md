# Ayudante Bodeguita - Arquitectura

## Objetivo tecnico

Definir una arquitectura simple, clara y mantenible para un MVP privado de uso interno, pensada para ser extendida por agentes IA con supervision humana.

Las prioridades tecnicas son:

- imports confiables
- reglas explicitas
- validaciones predecibles
- bajo acoplamiento
- facilidad de mantenimiento
- poca complejidad innecesaria

## Stack base

### Backend

- Node.js
- API REST
- Prisma ORM
- PostgreSQL
- Libreria para lectura de archivos `.xlsx`

### Frontend

- Aplicacion web privada
- Interfaz para importar archivos
- Tabla interactiva con filtros, orden y busqueda

## Estructura del proyecto

La raiz del proyecto contiene:

- `/backend`
- `/frontend`
- `/docs`

## Principios de diseno

- El backend valida y normaliza todos los datos antes de persistir.
- Cada importacion debe ser transaccional.
- El estado vigente se reemplaza por completo segun el tipo de archivo importado.
- No se guarda historial de imports ni archivos originales en el MVP.
- La tabla unificada no se materializa en base de datos; se construye por consulta.
- Las advertencias informan, pero no bloquean.
- Los errores de estructura o datos invalidos bloquean el import completo.

## Modelo de datos propuesto

### Product

Representa el catalogo vigente importado desde el Excel de productos.

Campos sugeridos:

- `id`
- `sku`
- `type`
- `parentSku`
- `name`
- `attribute1`
- `attribute1Variant`
- `attribute2`
- `attribute2Variant`
- `barcode`
- `oemCode`
- `description`
- `status`
- `currency`
- `internalCost`
- `basePrice`
- `vat`
- `finalPrice`
- `profitability`
- `stock`
- `reservedStock`
- `availableStock`
- `minimumStock`
- `visibleInSales`
- `category`
- `subcategory`
- `supplier`
- `notes`
- `purchaseAccount`
- `salesAccount`
- `inventoryAccount`
- `createdAt`
- `updatedAt`

Notas:

- `sku` debe ser unico.
- `type` debe aceptar al menos `Producto`, `Combo` y `Servicio`.
- Se importan productos activos e inactivos.

### PriceList

Define las listas fijas del sistema.

Campos sugeridos:

- `id`
- `code`
- `name`
- `createdAt`
- `updatedAt`

Valores iniciales esperados:

- `BODEGUITA`
- `DISTRIBUIDORA_MAYORISTA`

### PriceListItem

Representa el precio vigente de un SKU dentro de una lista.

Campos sugeridos:

- `id`
- `priceListId`
- `sku`
- `name`
- `category`
- `subcategory`
- `description`
- `basePrice`
- `vat`
- `finalPrice`
- `createdAt`
- `updatedAt`

Notas:

- cada par `priceListId + sku` debe ser unico
- `sku` se guarda como texto, incluso si parece numerico
- `finalPrice = 0` es un valor valido

## Estrategia de importacion

### Import de productos

Flujo propuesto:

1. Recibir archivo `.xlsx`.
2. Leer hoja y encabezados.
3. Validar columnas obligatorias.
4. Parsear todas las filas.
5. Normalizar strings y valores numericos.
6. Validar filas y detectar duplicados.
7. Si hay errores, rechazar todo sin modificar datos vigentes.
8. Si no hay errores, abrir transaccion.
9. Borrar catalogo actual de productos.
10. Insertar nuevo catalogo completo.
11. Confirmar transaccion y devolver resumen.

### Import de listas

Flujo propuesto:

1. Verificar que exista catalogo de productos.
2. Recibir archivo `.xlsx`.
3. Determinar la lista segun el endpoint.
4. Validar columnas obligatorias.
5. Parsear y normalizar filas.
6. Validar valores y detectar duplicados.
7. Detectar codigos inexistentes en productos como advertencias.
8. Si hay errores, rechazar todo sin modificar datos vigentes.
9. Si no hay errores, abrir transaccion.
10. Borrar items actuales de esa lista.
11. Insertar nuevos items.
12. Confirmar transaccion y devolver resumen con advertencias.

## Normalizacion de datos

- `SKU` y `Codigo` deben guardarse como texto.
- Se deben recortar espacios laterales.
- Los campos numericos deben convertirse a decimal de forma consistente.
- Debe soportarse entrada con coma o punto decimal.
- Los nombres, rubros y subrubros deben conservarse tal como llegan en el archivo.
- `Visible En Ventas` puede mapearse a booleano.

## Validaciones minimas

### Productos

Columnas obligatorias sugeridas:

- `Tipo`
- `SKU`
- `Nombre`
- `Estado`
- `Costo Interno`
- `Precio Final`
- `Stock`
- `Stock Reservado`
- `Stock Disponible`
- `Visible En Ventas`
- `Rubro`
- `Sub Rubro`

Campos opcionales:

- todos los demas

Errores que deben bloquear:

- `SKU` vacio
- `Nombre` vacio
- valores numericos invalidos
- duplicados de `SKU`
- `Tipo` fuera del conjunto permitido

### Listas

Columnas obligatorias:

- `Codigo`
- `Nombre`
- `Precio Final`

Campos opcionales:

- `Rubro`
- `Subrubro`
- `Descripcion`
- `Precio`
- `Iva`

Errores que deben bloquear:

- `Codigo` vacio
- `Nombre` vacio
- `Precio Final` invalido
- duplicados de `Codigo` dentro de la misma lista
- import sin catalogo de productos cargado

Advertencias que no bloquean:

- codigo presente en lista pero ausente en productos
- diferencias de nombre entre lista y producto para el mismo codigo

## Vista unificada

La vista principal debe construirse desde `Product` como tabla base.

Comportamiento:

- incluir todos los productos, combos y servicios
- unir precios de `BODEGUITA`
- unir precios de `DISTRIBUIDORA_MAYORISTA`
- si un producto no existe en una lista, exponer `0`
- mostrar todos los productos por defecto
- permitir filtros, orden y busqueda

Campos de busqueda esperados:

- `SKU`
- `Nombre`
- `Codigo Barras`
- `Rubro`
- `Sub Rubro`

## Endpoints propuestos para el MVP

- `POST /imports/products`
- `POST /imports/price-lists/bodeguita`
- `POST /imports/price-lists/distribuidora-mayorista`
- `GET /products/unified`

## Respuesta esperada de importacion

Cada import debe responder con una estructura simple y legible:

- tipo de import
- nombre de archivo
- filas leidas
- filas importadas
- advertencias
- errores

## Decisiones fuera del MVP

- integracion con API de Contabilium
- historial de imports
- auditoria persistente
- versionado de archivos
- roles y permisos complejos
- sincronizacion automatica
- tabla materializada para lectura

## Relacion con el plan

El plan de desarrollo se mantiene en [plan.md](/f:/Data/Documents/proyectos/ayudante-bodeguita/docs/plan.md) para poder revisarlo de forma separada a las decisiones de arquitectura.
