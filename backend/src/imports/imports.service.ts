import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  parseXlsx,
  findMissingColumns,
  normalizeString,
  parseDecimal,
  parseBoolean,
} from './xlsx.utils';

// -- Types --

interface ImportResult {
  type: string;
  filename: string;
  rowsRead: number;
  rowsImported: number;
  warnings: string[];
  errors: string[];
}

interface PurchaseReviewRow {
  sku: string;
  name: string;
  cost: number;
  quantity: number;
}

// -- Required columns --

const PRODUCT_REQUIRED_COLUMNS = [
  'Tipo',
  'SKU',
  'Nombre',
  'Estado',
  'Costo Interno',
  'Precio Final',
  'Stock',
  'Stock Reservado',
  'Stock Disponible',
  'Visible En Ventas',
  'Rubro',
  'Sub Rubro',
];

const PRICE_LIST_REQUIRED_COLUMNS = ['Codigo', 'Nombre', 'Precio Final'];

const ALLOWED_TYPES = ['Producto', 'Combo', 'Servicio'];

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== IMPORT PRODUCTOS ==========

  async importProducts(
    buffer: Buffer,
    filename: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      type: 'productos',
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
    };

    // 1. Parsear xlsx
    let parsed;
    try {
      parsed = parseXlsx(buffer);
    } catch (err) {
      throw new BadRequestException(
        `Error al leer el archivo: ${(err as Error).message}`,
      );
    }

    // 2. Validar columnas obligatorias
    const missing = findMissingColumns(
      parsed.headers,
      PRODUCT_REQUIRED_COLUMNS,
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Columnas obligatorias faltantes: ${missing.join(', ')}`,
      );
    }

    result.rowsRead = parsed.rows.length;

    // 3. Parsear y validar filas
    const skusSeen = new Set<string>();
    const validProducts: Array<Record<string, unknown>> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNum = i + 2; // +2 because row 1 is header in Excel

      const sku = normalizeString(row['SKU']);
      const name = normalizeString(row['Nombre']);
      const type = normalizeString(row['Tipo']);

      // Validaciones bloqueantes
      if (!sku) {
        result.errors.push(`Fila ${rowNum}: SKU vacío.`);
        continue;
      }
      if (!name) {
        result.errors.push(`Fila ${rowNum}: Nombre vacío.`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(type)) {
        result.errors.push(
          `Fila ${rowNum}: Tipo "${type}" no permitido (SKU: ${sku}).`,
        );
        continue;
      }
      if (skusSeen.has(sku)) {
        result.errors.push(`Fila ${rowNum}: SKU "${sku}" duplicado.`);
        continue;
      }

      // Parsear numéricos
      const internalCost = parseDecimal(row['Costo Interno']);
      const basePrice = parseDecimal(row['Precio']);
      const vat = parseDecimal(row['Iva']);
      const finalPrice = parseDecimal(row['Precio Final']);
      const profitability = parseDecimal(row['Rentabilidad']);
      const stock = parseDecimal(row['Stock']);
      const reservedStock = parseDecimal(row['Stock Reservado']);
      const availableStock = parseDecimal(row['Stock Disponible']);
      const minimumStock = parseDecimal(row['Stock Minimo']);

      if (internalCost === null) {
        result.errors.push(
          `Fila ${rowNum}: Costo Interno inválido (SKU: ${sku}).`,
        );
        continue;
      }
      if (finalPrice === null) {
        result.errors.push(
          `Fila ${rowNum}: Precio Final inválido (SKU: ${sku}).`,
        );
        continue;
      }
      if (stock === null) {
        result.errors.push(`Fila ${rowNum}: Stock inválido (SKU: ${sku}).`);
        continue;
      }
      if (reservedStock === null) {
        result.errors.push(
          `Fila ${rowNum}: Stock Reservado inválido (SKU: ${sku}).`,
        );
        continue;
      }
      if (availableStock === null) {
        result.errors.push(
          `Fila ${rowNum}: Stock Disponible inválido (SKU: ${sku}).`,
        );
        continue;
      }

      skusSeen.add(sku);

      validProducts.push({
        sku,
        type,
        parentSku: normalizeString(row['SKU Padre']) || null,
        name,
        attribute1: normalizeString(row['Atributo 1']) || null,
        attribute1Variant:
          normalizeString(row['Variante De Atributo 1']) || null,
        attribute2: normalizeString(row['Atributo 2']) || null,
        attribute2Variant:
          normalizeString(row['Variante De Atributo 2']) || null,
        barcode: normalizeString(row['Codigo Barras']) || null,
        oemCode: normalizeString(row['Codigo Oem']) || null,
        description: normalizeString(row['Descripcion']) || null,
        status: normalizeString(row['Estado']),
        currency: normalizeString(row['Moneda']) || null,
        internalCost,
        basePrice: basePrice ?? 0,
        vat: vat ?? 0,
        finalPrice,
        profitability: profitability ?? 0,
        stock,
        reservedStock,
        availableStock,
        minimumStock: minimumStock ?? 0,
        visibleInSales: parseBoolean(row['Visible En Ventas']),
        category: normalizeString(row['Rubro']) || null,
        subcategory: normalizeString(row['Sub Rubro']) || null,
        supplier: normalizeString(row['Proveedor']) || null,
        notes: normalizeString(row['Observaciones']) || null,
        purchaseAccount: normalizeString(row['CC Compras']) || null,
        salesAccount: normalizeString(row['CC Ventas']) || null,
        inventoryAccount: normalizeString(row['CC Mercaderia']) || null,
      });
    }

    // 4. Si hay errores, rechazar todo
    if (result.errors.length > 0) {
      return result;
    }

    // 5. Transacción: borrar y reinsertar
    await this.prisma.$transaction(
      async (tx) => {
        await tx.product.deleteMany();
        if (validProducts.length > 0) {
          await tx.product.createMany({ data: validProducts as any });
        }
      },
      { timeout: 60000 },
    );

    result.rowsImported = validProducts.length;
    return result;
  }

  // ========== IMPORT LISTA DE PRECIOS ==========

  async importPriceList(
    buffer: Buffer,
    filename: string,
    listCode: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      type: `lista-${listCode.toLowerCase()}`,
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
    };

    // 1. Verificar que existe catálogo de productos
    const productCount = await this.prisma.product.count();
    if (productCount === 0) {
      throw new BadRequestException(
        'No se puede importar una lista de precios sin un catálogo de productos cargado.',
      );
    }

    // 2. Verificar que existe la lista
    const priceList = await this.prisma.priceList.findUnique({
      where: { code: listCode },
    });
    if (!priceList) {
      throw new BadRequestException(
        `Lista de precios "${listCode}" no encontrada.`,
      );
    }

    // 3. Parsear xlsx
    let parsed;
    try {
      parsed = parseXlsx(buffer);
    } catch (err) {
      throw new BadRequestException(
        `Error al leer el archivo: ${(err as Error).message}`,
      );
    }

    // 4. Validar columnas
    const missing = findMissingColumns(
      parsed.headers,
      PRICE_LIST_REQUIRED_COLUMNS,
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Columnas obligatorias faltantes: ${missing.join(', ')}`,
      );
    }

    result.rowsRead = parsed.rows.length;

    // 5. Obtener SKUs existentes para validación de advertencias
    const existingProducts = await this.prisma.product.findMany({
      select: { sku: true, name: true },
    });
    const productMap = new Map(
      existingProducts.map((p) => [p.sku, p.name]),
    );

    // 6. Parsear y validar filas
    const codesSeen = new Set<string>();
    const validItems: Array<Record<string, unknown>> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNum = i + 2;

      const code = normalizeString(row['Codigo']);
      const name = normalizeString(row['Nombre']);
      const finalPrice = parseDecimal(row['Precio Final']);

      // Validaciones bloqueantes
      if (!code) {
        result.errors.push(`Fila ${rowNum}: Código vacío.`);
        continue;
      }
      if (!name) {
        result.errors.push(`Fila ${rowNum}: Nombre vacío.`);
        continue;
      }
      if (finalPrice === null) {
        result.errors.push(
          `Fila ${rowNum}: Precio Final inválido (Código: ${code}).`,
        );
        continue;
      }
      if (codesSeen.has(code)) {
        result.errors.push(`Fila ${rowNum}: Código "${code}" duplicado.`);
        continue;
      }

      codesSeen.add(code);

      // Advertencias (no bloquean)
      if (!productMap.has(code)) {
        result.warnings.push(
          `Fila ${rowNum}: Código "${code}" no existe en el catálogo de productos.`,
        );
      } else {
        const productName = productMap.get(code);
        if (productName && productName !== name) {
          result.warnings.push(
            `Fila ${rowNum}: Nombre difiere para código "${code}". Producto: "${productName}", Lista: "${name}".`,
          );
        }
      }

      const basePrice = parseDecimal(row['Precio']);
      const vat = parseDecimal(row['Iva']);

      validItems.push({
        priceListId: priceList.id,
        sku: code,
        name,
        category: normalizeString(row['Rubro']) || null,
        subcategory: normalizeString(row['Subrubro']) || null,
        description: normalizeString(row['Descripcion']) || null,
        basePrice: basePrice ?? 0,
        vat: vat ?? 0,
        finalPrice,
      });
    }

    // 7. Si hay errores, rechazar todo
    if (result.errors.length > 0) {
      return result;
    }

    // 8. Transacción: borrar items de esta lista y reinsertar
    await this.prisma.$transaction(
      async (tx) => {
        await tx.priceListItem.deleteMany({
          where: { priceListId: priceList.id },
        });
        if (validItems.length > 0) {
          await tx.priceListItem.createMany({ data: validItems as any });
        }
      },
      { timeout: 60000 },
    );

    result.rowsImported = validItems.length;
    return result;
  }

  async parsePurchaseReviewFromText(text: string) {
    const parsed = this.parseTabularText(text);
    return this.normalizePurchaseRows(parsed.headers, parsed.rows);
  }

  async parsePurchaseReviewFromFile(buffer: Buffer, filename: string) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv')) {
      const text = buffer.toString('utf-8');
      const parsed = this.parseTabularText(text, ',');
      return this.normalizePurchaseRows(parsed.headers, parsed.rows);
    }

    const parsed = parseXlsx(buffer);
    return this.normalizePurchaseRows(parsed.headers, parsed.rows);
  }

  private parseTabularText(
    text: string,
    delimiter = '\t',
  ): { headers: string[]; rows: Record<string, unknown>[] } {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException(
        'El texto debe incluir encabezados y al menos una fila.',
      );
    }

    const headers = lines[0].split(delimiter).map((h) => h.trim());
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = lines[i].split(delimiter);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private normalizePurchaseRows(
    headers: string[],
    rows: Record<string, unknown>[],
  ) {
    const result = {
      rowsRead: rows.length,
      rowsImported: 0,
      rows: [] as PurchaseReviewRow[],
      warnings: [] as string[],
      errors: [] as string[],
    };

    const fieldMap = new Map<string, string>();
    headers.forEach((header) => {
      fieldMap.set(this.normalizeHeader(header), header);
    });

    const skuKey = this.findHeader(fieldMap, ['sku', 'codigo', 'codigoproducto', 'codigoarticulo']);
    const nameKey = this.findHeader(fieldMap, ['nombre', 'descripcion', 'producto']);
    const costKey = this.findHeader(fieldMap, [
      'costo',
      'costointerno',
      'precio',
      'preciocosto',
      'preciounitario',
      'preciounit',
      'preciofinal',
    ]);
    const quantityKey = this.findHeader(fieldMap, ['cantidad', 'cant', 'unidades']);

    if (!skuKey && !nameKey) {
      throw new BadRequestException(
        'No se pudo identificar una columna SKU/Codigo o Nombre.',
      );
    }
    if (!costKey) {
      throw new BadRequestException(
        'No se pudo identificar una columna de costo/precio.',
      );
    }

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNum = i + 2;

      const sku = skuKey ? normalizeString(row[skuKey]) : '';
      const name = nameKey ? normalizeString(row[nameKey]) : '';
      const cost = parseDecimal(row[costKey]);
      const quantity = quantityKey ? parseDecimal(row[quantityKey]) : 1;
      const normalizedName = this.normalizeHeader(name);

      if (!sku && !name) {
        result.warnings.push(`Fila ${rowNum}: sin SKU y sin nombre, omitida.`);
        continue;
      }
      if (normalizedName.includes('ajusteredondeo')) {
        result.warnings.push(`Fila ${rowNum}: ajuste de redondeo omitido.`);
        continue;
      }
      if (cost === null || cost <= 0) {
        result.errors.push(`Fila ${rowNum}: costo invÃ¡lido (${sku || name}).`);
        continue;
      }

      result.rows.push({
        sku,
        name,
        cost,
        quantity: quantity === null || quantity <= 0 ? 1 : quantity,
      });
    }

    result.rowsImported = result.rows.length;
    return result;
  }

  private normalizeHeader(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private findHeader(fieldMap: Map<string, string>, candidates: string[]) {
    for (const candidate of candidates) {
      const matched = fieldMap.get(candidate);
      if (matched) {
        return matched;
      }
    }
    return null;
  }
}
