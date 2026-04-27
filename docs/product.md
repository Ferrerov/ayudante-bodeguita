# Ayudante Bodeguita - Producto

## Objetivo

Construir una web app privada de uso interno para importar archivos `.xlsx` exportados manualmente desde Contabilium, procesarlos y mostrar una tabla unificada con informacion util para la operacion.

## Alcance del MVP

El MVP debe permitir:

- Importar archivo de productos.
- Importar archivo de lista de precios `BODEGUITA`.
- Importar archivo de lista de precios `DISTRIBUIDORA MAYORISTA`.
- Reemplazar los datos vigentes cada vez que se importa un archivo nuevo del mismo tipo.
- Mostrar una tabla unificada con todos los productos, combos y servicios.
- Permitir filtros, ordenamiento y busqueda sobre la tabla.
- Mostrar precios de ambas listas.
- Mostrar productos con precio `0`.
- Mostrar advertencias de importacion en la respuesta del proceso.

## Fuente de datos

No se utilizara la API de Contabilium en este MVP.

La fuente de verdad sera:

- Un archivo `.xlsx` de productos.
- Un archivo `.xlsx` de lista `BODEGUITA`.
- Un archivo `.xlsx` de lista `DISTRIBUIDORA MAYORISTA`.

## Archivos revisados

Archivos de ejemplo actualmente disponibles:

- `PRODUCTOS`: `_tmp_Productos_74369_20260427.xlsx`
- `DISTRIBUIDORA MAYORISTA`: `_tmp_ListaPrecio_12198_20260427.xlsx`
- `BODEGUITA`: `_tmp_ListaPrecio_12217_20260427.xlsx`

## Regla principal de cruce

- `Productos.SKU = ListaPrecio.Codigo`

## Comportamiento funcional acordado

- El archivo importado representa el estado vigente completo de ese tipo de datos.
- Un nuevo import de productos reemplaza todo el catalogo actual.
- Un nuevo import de una lista reemplaza todos los precios actuales de esa lista.
- Si un producto ya no aparece en el nuevo archivo de productos, desaparece del sistema.
- No se guarda historial de versiones ni auditoria persistente en este MVP.
- No se guardan los archivos `.xlsx` en el servidor; solo se procesan y persisten los datos resultantes.

## Reglas de negocio

- Si un producto no aparece en una lista de precios, se muestra precio `0` para esa lista.
- Si una lista trae un codigo que no existe en productos, eso genera advertencia y no bloquea el import.
- Si una lista trae `Precio Final = 0`, se guarda como precio real `0`.
- Se importan productos activos e inactivos.
- La vista principal debe mostrar todos los productos por defecto.
- Las listas de precios solo pueden importarse si ya existe un catalogo de productos cargado.

## Errores que bloquean importacion

El import debe fallar completo si ocurre cualquiera de estos casos:

- Archivo no valido o no legible como `.xlsx`.
- Hoja sin datos.
- Faltan columnas obligatorias.
- Filas sin identificador principal:
  - `SKU` vacio en productos.
  - `Codigo` vacio en listas.
- `Nombre` vacio.
- Valores numericos invalidos en campos requeridos.
- Duplicados de `SKU` en productos.
- Duplicados de `Codigo` dentro de la misma lista.
- Intento de importar listas sin catalogo de productos cargado.

## Advertencias

No bloquean el import, pero deben devolverse en la respuesta:

- Codigos en listas que no existen en productos.
- Diferencias de nombre entre producto y lista para el mismo codigo.
- Productos sin precio en una o ambas listas.

## Tabla unificada

La tabla debe incluir:

- Todos los productos, combos y servicios.
- `Precio BODEGUITA`
- `Precio DISTRIBUIDORA MAYORISTA`
- Campos relevantes del producto

## Funcionalidades de la tabla

- Filtros por columnas
- Ordenamiento por columnas
- Busqueda por:
  - `SKU`
  - `Nombre`
  - `Codigo Barras`
  - `Rubro`
  - `Sub Rubro`
- Visualizacion de productos con precio `0`

## Campos observados en archivos reales

### Productos

Columnas observadas:

- `Tipo`
- `SKU`
- `SKU Padre`
- `Nombre`
- `Atributo 1`
- `Variante De Atributo 1`
- `Atributo 2`
- `Variante De Atributo 2`
- `Codigo Barras`
- `Codigo Oem`
- `Descripcion`
- `Estado`
- `Moneda`
- `Costo Interno`
- `Precio`
- `Iva`
- `Precio Final`
- `Rentabilidad`
- `Stock`
- `Stock Reservado`
- `Stock Disponible`
- `Stock Minimo`
- `Visible En Ventas`
- `Rubro`
- `Sub Rubro`
- `Proveedor`
- `Observaciones`
- `CC Compras`
- `CC Ventas`
- `CC Mercaderia`

Tipos detectados:

- `Producto`
- `Combo`
- `Servicio`

### Listas de precios

Columnas observadas:

- `Rubro`
- `Subrubro`
- `Codigo`
- `Nombre`
- `Descripcion`
- `Precio`
- `Iva`
- `Precio Final`
