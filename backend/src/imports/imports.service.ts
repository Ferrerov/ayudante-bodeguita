import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  parseXlsx,
  findMissingColumns,
  normalizeString,
  parseDecimal,
  parseBoolean,
} from './xlsx.utils';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

interface ImportResult {
  type: string;
  filename: string;
  rowsRead: number;
  rowsImported: number;
  warnings: string[];
  errors: string[];
  jobId?: number;
}

interface PurchaseReviewRow {
  sku: string;
  name: string;
  cost: number;
  quantity: number;
}

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
const REPLENISHMENT_REQUIRED_COLUMNS = ['Codigo', 'Nombre', 'Cantidad'];
const SUPPLIER_REQUIRED_COLUMNS = ['Personeria', 'Razon Social', 'Tipo Documeto', 'Documento'];
const ALLOWED_TYPES = ['Producto', 'Combo', 'Servicio'];

type JobType =
  | 'PRODUCTS'
  | 'PRICE_LIST_BODEGUITA'
  | 'PRICE_LIST_DISTRIBUIDORA_MAYORISTA'
  | 'REPLENISHMENT'
  | 'SUPPLIERS'
  | 'UNDO'
  | 'RESTORE';

const PRICE_LIST_NAMES: Record<string, string> = {
  BODEGUITA: 'Bodeguita',
  DISTRIBUIDORA_MAYORISTA: 'Distribuidora Mayorista',
};

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobs(params: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ImportJobWhereInput = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    const [total, rows] = await Promise.all([
      this.prisma.importJob.count({ where }),
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.serializeJob(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJob(id: number) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Importacion no encontrada.');

    const [snapshots, movements] = await Promise.all([
      this.prisma.importSnapshot.findMany({ where: { jobId: id } }),
      this.prisma.replenishmentMovement.findMany({ where: { jobId: id } }),
    ]);

    return {
      ...this.serializeJob(job),
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        domainType: snapshot.domainType,
        scopeKey: snapshot.scopeKey,
        rows: Array.isArray(snapshot.data) ? snapshot.data.length : 0,
        createdAt: snapshot.createdAt,
      })),
      movements: movements.map((movement) => ({
        id: movement.id,
        sku: movement.sku,
        delta: Number(movement.delta),
        beforeQty: Number(movement.beforeQty),
        afterQty: Number(movement.afterQty),
      })),
    };
  }

  async undoJob(id: number) {
    const sourceJob = await this.prisma.importJob.findUnique({ where: { id } });
    if (!sourceJob) throw new NotFoundException('Importacion no encontrada.');
    if (sourceJob.status !== 'SUCCESS') {
      throw new BadRequestException('Solo se pueden deshacer importaciones exitosas.');
    }
    if (sourceJob.undoneAt) {
      throw new BadRequestException('Esta importacion ya fue deshecha.');
    }

    const undoJob = await this.prisma.importJob.create({
      data: {
        type: 'UNDO',
        status: 'RUNNING',
        filename: `undo-${sourceJob.id}`,
        undoOfJobId: sourceJob.id,
        metadata: { sourceJobType: sourceJob.type },
      },
    });

    try {
      await this.applyRestoreForJob(sourceJob.id);

      await this.prisma.$transaction([
        this.prisma.importJob.update({
          where: { id: sourceJob.id },
          data: { undoneAt: new Date() },
        }),
        this.prisma.importJob.update({
          where: { id: undoJob.id },
          data: {
            status: 'SUCCESS',
            rowsRead: 0,
            rowsImported: 0,
            warnings: [],
            errors: [],
            finishedAt: new Date(),
          },
        }),
      ]);

      return { ok: true, undoJobId: undoJob.id };
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id: undoJob.id },
        data: {
          status: 'FAILED',
          errors: [this.errorMessage(error)],
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async restoreJob(id: number) {
    const sourceJob = await this.prisma.importJob.findUnique({ where: { id } });
    if (!sourceJob) throw new NotFoundException('Importacion no encontrada.');

    const restoreJob = await this.prisma.importJob.create({
      data: {
        type: 'RESTORE',
        status: 'RUNNING',
        filename: `restore-${sourceJob.id}`,
        metadata: { sourceJobType: sourceJob.type },
      },
    });

    try {
      await this.applyRestoreForJob(sourceJob.id);
      await this.prisma.importJob.update({
        where: { id: restoreJob.id },
        data: {
          status: 'SUCCESS',
          warnings: [],
          errors: [],
          finishedAt: new Date(),
        },
      });
      return { ok: true, restoreJobId: restoreJob.id };
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id: restoreJob.id },
        data: {
          status: 'FAILED',
          errors: [this.errorMessage(error)],
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async importProducts(buffer: Buffer, filename: string): Promise<ImportResult> {
    const job = await this.startJob('PRODUCTS', filename, buffer);
    const result: ImportResult = {
      type: 'productos',
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
      jobId: job.id,
    };

    let parsed;
    try {
      parsed = parseXlsx(buffer);
      const missing = findMissingColumns(parsed.headers, PRODUCT_REQUIRED_COLUMNS);
      if (missing.length > 0) {
        throw new BadRequestException(`Columnas obligatorias faltantes: ${missing.join(', ')}`);
      }

      result.rowsRead = parsed.rows.length;
      const skusSeen = new Set<string>();
      const validProducts: Array<Record<string, unknown>> = [];

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const rowNum = i + 2;

        const sku = normalizeString(row['SKU']);
        const name = normalizeString(row['Nombre']);
        const type = normalizeString(row['Tipo']);

        if (!sku) {
          result.errors.push(`Fila ${rowNum}: SKU vacio.`);
          continue;
        }
        if (!name) {
          result.errors.push(`Fila ${rowNum}: Nombre vacio.`);
          continue;
        }
        if (!ALLOWED_TYPES.includes(type)) {
          result.errors.push(`Fila ${rowNum}: Tipo "${type}" no permitido (SKU: ${sku}).`);
          continue;
        }
        if (skusSeen.has(sku)) {
          result.errors.push(`Fila ${rowNum}: SKU "${sku}" duplicado.`);
          continue;
        }

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
          result.errors.push(`Fila ${rowNum}: Costo Interno invalido (SKU: ${sku}).`);
          continue;
        }
        if (finalPrice === null) {
          result.errors.push(`Fila ${rowNum}: Precio Final invalido (SKU: ${sku}).`);
          continue;
        }
        if (stock === null || reservedStock === null || availableStock === null) {
          result.errors.push(`Fila ${rowNum}: Stock invalido (SKU: ${sku}).`);
          continue;
        }

        skusSeen.add(sku);
        validProducts.push({
          sku,
          type,
          parentSku: normalizeString(row['SKU Padre']) || null,
          name,
          attribute1: normalizeString(row['Atributo 1']) || null,
          attribute1Variant: normalizeString(row['Variante De Atributo 1']) || null,
          attribute2: normalizeString(row['Atributo 2']) || null,
          attribute2Variant: normalizeString(row['Variante De Atributo 2']) || null,
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

      if (result.errors.length > 0) {
        await this.finishJob(job.id, 'FAILED', result);
        return result;
      }

      const before = await this.prisma.product.findMany();
      await this.prisma.$transaction(async (tx) => {
        await tx.importSnapshot.create({
          data: {
            jobId: job.id,
            domainType: 'PRODUCTS',
            scopeKey: null,
            data: before as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.product.deleteMany();
        if (validProducts.length > 0) {
          await tx.product.createMany({ data: validProducts as any });
        }
      });

      result.rowsImported = validProducts.length;
      await this.finishJob(job.id, 'SUCCESS', result);
      return result;
    } catch (error) {
      await this.failJob(job.id, result, error);
      throw error;
    }
  }

  async importPriceList(
    buffer: Buffer,
    filename: string,
    listCode: string,
  ): Promise<ImportResult> {
    const jobType: JobType =
      listCode === 'BODEGUITA'
        ? 'PRICE_LIST_BODEGUITA'
        : 'PRICE_LIST_DISTRIBUIDORA_MAYORISTA';
    const job = await this.startJob(jobType, filename, buffer);
    const result: ImportResult = {
      type: `lista-${listCode.toLowerCase()}`,
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
      jobId: job.id,
    };

    try {
      const productCount = await this.prisma.product.count();
      if (productCount === 0) {
        throw new BadRequestException('No se puede importar una lista sin catalogo de productos.');
      }

      const priceList = await this.ensurePriceList(listCode);

      const parsed = parseXlsx(buffer);
      const missing = findMissingColumns(parsed.headers, PRICE_LIST_REQUIRED_COLUMNS);
      if (missing.length > 0) {
        throw new BadRequestException(`Columnas obligatorias faltantes: ${missing.join(', ')}`);
      }

      result.rowsRead = parsed.rows.length;
      const existingProducts = await this.prisma.product.findMany({ select: { sku: true, name: true } });
      const productMap = new Map(existingProducts.map((p) => [p.sku, p.name]));

      const codesSeen = new Set<string>();
      const validItems: Array<Record<string, unknown>> = [];

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const rowNum = i + 2;

        const code = normalizeString(row['Codigo']);
        const name = normalizeString(row['Nombre']);
        const finalPrice = parseDecimal(row['Precio Final']);

        if (!code) {
          result.errors.push(`Fila ${rowNum}: Codigo vacio.`);
          continue;
        }
        if (!name) {
          result.errors.push(`Fila ${rowNum}: Nombre vacio.`);
          continue;
        }
        if (finalPrice === null) {
          result.errors.push(`Fila ${rowNum}: Precio Final invalido (Codigo: ${code}).`);
          continue;
        }
        if (codesSeen.has(code)) {
          result.errors.push(`Fila ${rowNum}: Codigo "${code}" duplicado.`);
          continue;
        }

        codesSeen.add(code);

        if (!productMap.has(code)) {
          result.warnings.push(`Fila ${rowNum}: Codigo "${code}" no existe en catalogo.`);
        } else if (productMap.get(code) !== name) {
          result.warnings.push(
            `Fila ${rowNum}: Nombre difiere para codigo "${code}". Producto: "${productMap.get(code)}", Lista: "${name}".`,
          );
        }

        validItems.push({
          priceListId: priceList.id,
          sku: code,
          name,
          category: normalizeString(row['Rubro']) || null,
          subcategory: normalizeString(row['Subrubro']) || null,
          description: normalizeString(row['Descripcion']) || null,
          basePrice: parseDecimal(row['Precio']) ?? 0,
          vat: parseDecimal(row['Iva']) ?? 0,
          finalPrice,
        });
      }

      if (result.errors.length > 0) {
        await this.finishJob(job.id, 'FAILED', result);
        return result;
      }

      const before = await this.prisma.priceListItem.findMany({ where: { priceListId: priceList.id } });
      await this.prisma.$transaction(async (tx) => {
        await tx.importSnapshot.create({
          data: {
            jobId: job.id,
            domainType: 'PRICE_LIST',
            scopeKey: listCode,
            data: before as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.priceListItem.deleteMany({ where: { priceListId: priceList.id } });
        if (validItems.length > 0) {
          await tx.priceListItem.createMany({ data: validItems as any });
        }
      });

      result.rowsImported = validItems.length;
      await this.finishJob(job.id, 'SUCCESS', result);
      return result;
    } catch (error) {
      await this.failJob(job.id, result, error);
      throw error;
    }
  }

  private async ensurePriceList(code: string) {
    const name = PRICE_LIST_NAMES[code];
    if (!name) {
      throw new BadRequestException(`Lista de precios "${code}" no soportada.`);
    }

    return this.prisma.priceList.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }

  async importReplenishment(buffer: Buffer, filename: string): Promise<ImportResult> {
    const job = await this.startJob('REPLENISHMENT', filename, buffer);
    const result: ImportResult = {
      type: 'reposicion',
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
      jobId: job.id,
    };

    try {
      const productCount = await this.prisma.product.count();
      if (productCount === 0) {
        throw new BadRequestException('No se puede importar reposicion sin catalogo de productos cargado.');
      }

      const parsed = parseXlsx(buffer);
      const missing = findMissingColumns(parsed.headers, REPLENISHMENT_REQUIRED_COLUMNS);
      if (missing.length > 0) {
        throw new BadRequestException(`Columnas obligatorias faltantes: ${missing.join(', ')}`);
      }

      result.rowsRead = parsed.rows.length;
      const grouped = new Map<string, { sku: string; name: string; quantity: number }>();

      for (let i = 0; i < parsed.rows.length; i += 1) {
        const row = parsed.rows[i];
        const rowNum = i + 2;
        const sku = normalizeString(row['Codigo']);
        const name = normalizeString(row['Nombre']);
        const quantity = parseDecimal(row['Cantidad']);

        if (!sku) {
          result.errors.push(`Fila ${rowNum}: Codigo vacio.`);
          continue;
        }
        if (!name) {
          result.errors.push(`Fila ${rowNum}: Nombre vacio.`);
          continue;
        }
        if (quantity === null) {
          result.errors.push(`Fila ${rowNum}: Cantidad invalida (Codigo: ${sku}).`);
          continue;
        }

        const replenishmentQuantity = Math.abs(quantity);
        if (replenishmentQuantity === 0) {
          result.warnings.push(`Fila ${rowNum}: Cantidad cero omitida (Codigo: ${sku}).`);
          continue;
        }

        const current = grouped.get(sku);
        if (current) {
          current.quantity += replenishmentQuantity;
        } else {
          grouped.set(sku, { sku, name, quantity: replenishmentQuantity });
        }
      }

      if (result.errors.length > 0) {
        await this.finishJob(job.id, 'FAILED', result);
        return result;
      }

      const products = await this.prisma.product.findMany({
        where: { sku: { in: Array.from(grouped.keys()) } },
        select: { sku: true, name: true },
      });
      const productMap = new Map(products.map((product) => [product.sku, product]));
      const items = Array.from(grouped.values()).filter((item) => {
        const product = productMap.get(item.sku);
        if (!product) {
          result.warnings.push(`Codigo "${item.sku}" no existe en catalogo y fue omitido.`);
          return false;
        }
        if (product.name !== item.name) {
          result.warnings.push(
            `Codigo "${item.sku}": nombre difiere. Catalogo: "${product.name}", Archivo: "${item.name}".`,
          );
        }
        item.name = product.name;
        return true;
      });

      await this.prisma.$transaction(async (tx) => {
        for (const item of items) {
          const existing = await tx.replenishmentItem.findUnique({ where: { sku: item.sku } });
          const beforeQty = Number(existing?.quantity ?? 0);
          const afterQty = beforeQty + item.quantity;

          if (existing) {
            await tx.replenishmentItem.update({
              where: { sku: item.sku },
              data: {
                name: item.name,
                quantity: { increment: item.quantity },
                status: 'PENDING',
                replenishedAt: null,
              },
            });
          } else {
            await tx.replenishmentItem.create({
              data: {
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                status: 'PENDING',
                replenishedAt: null,
              },
            });
          }

          await tx.replenishmentMovement.create({
            data: {
              jobId: job.id,
              sku: item.sku,
              delta: item.quantity,
              beforeQty,
              afterQty,
            },
          });
        }
      });

      result.rowsImported = items.length;
      await this.finishJob(job.id, 'SUCCESS', result);
      return result;
    } catch (error) {
      await this.failJob(job.id, result, error);
      throw error;
    }
  }

  async importSuppliers(buffer: Buffer, filename: string): Promise<ImportResult> {
    const job = await this.startJob('SUPPLIERS', filename, buffer);
    const result: ImportResult = {
      type: 'proveedores',
      filename,
      rowsRead: 0,
      rowsImported: 0,
      warnings: [],
      errors: [],
      jobId: job.id,
    };

    try {
      const parsed = parseXlsx(buffer);
      const missing = findMissingColumns(parsed.headers, SUPPLIER_REQUIRED_COLUMNS);
      if (missing.length > 0) {
        throw new BadRequestException(`Columnas obligatorias faltantes: ${missing.join(', ')}`);
      }

      result.rowsRead = parsed.rows.length;
      const validSuppliers: Array<Record<string, unknown>> = [];
      const seen = new Set<string>();

      for (let i = 0; i < parsed.rows.length; i += 1) {
        const row = parsed.rows[i];
        const rowNum = i + 2;

        const razonSocial = normalizeString(row['Razon Social']);
        const personeria = normalizeString(row['Personeria']);
        const documento = normalizeString(row['Documento']);
        const code = normalizeString(row['Codigo']);

        if (!razonSocial) {
          result.errors.push(`Fila ${rowNum}: Razon Social vacia.`);
          continue;
        }

        const dedupeKey = `${code || '-'}|${documento || '-'}|${razonSocial.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          result.errors.push(`Fila ${rowNum}: proveedor duplicado (${razonSocial}).`);
          continue;
        }
        seen.add(dedupeKey);

        validSuppliers.push({
          personeria: personeria || null,
          razonSocial,
          nombreFantasia: normalizeString(row['Nombre Fantasia']) || null,
          code: code || null,
          tipoDocumento: normalizeString(row['Tipo Documeto']) || null,
          documento: documento || null,
          categoriaImpositiva: normalizeString(row['Categoria Impositiva']) || null,
          telefono: normalizeString(row['Telefono']) || null,
          celular: normalizeString(row['Celular']) || null,
          email: normalizeString(row['Email']) || null,
          web: normalizeString(row['Web']) || null,
          observaciones: normalizeString(row['Observaciones']) || null,
          provincia: normalizeString(row['Provincia']) || null,
          ciudad: normalizeString(row['Ciudad']) || null,
          domicilio: normalizeString(row['Domicilio']) || null,
          pisoDepto: normalizeString(row['Piso Depto']) || null,
          codigoPostal: normalizeString(row['Codigo Postal']) || null,
          emailsEnvioFc: normalizeString(row['Emails Envio Fc']) || null,
          tags: normalizeString(row['Tags']) || null,
        });
      }

      if (result.errors.length > 0) {
        await this.finishJob(job.id, 'FAILED', result);
        return result;
      }

      const before = await this.prisma.supplier.findMany();
      await this.prisma.$transaction(async (tx) => {
        await tx.importSnapshot.create({
          data: {
            jobId: job.id,
            domainType: 'SUPPLIERS',
            scopeKey: null,
            data: before as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.supplier.deleteMany();
        if (validSuppliers.length > 0) {
          await tx.supplier.createMany({ data: validSuppliers as any });
        }
      });

      result.rowsImported = validSuppliers.length;
      await this.finishJob(job.id, 'SUCCESS', result);
      return result;
    } catch (error) {
      await this.failJob(job.id, result, error);
      throw error;
    }
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

  private async startJob(type: JobType, filename: string, buffer?: Buffer) {
    return this.prisma.importJob.create({
      data: {
        type,
        status: 'RUNNING',
        filename,
        checksum: buffer ? createHash('sha256').update(buffer).digest('hex') : null,
      },
    });
  }

  private async finishJob(jobId: number, status: 'SUCCESS' | 'FAILED', result: ImportResult) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status,
        rowsRead: result.rowsRead,
        rowsImported: result.rowsImported,
        warnings: result.warnings,
        errors: result.errors,
        finishedAt: new Date(),
      },
    });
  }

  private async failJob(jobId: number, result: ImportResult, error: unknown) {
    result.errors.push(this.errorMessage(error));
    await this.finishJob(jobId, 'FAILED', result);
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Error inesperado durante la importacion.';
  }

  private serializeJob(job: any) {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      filename: job.filename,
      checksum: job.checksum,
      rowsRead: job.rowsRead,
      rowsImported: job.rowsImported,
      warnings: Array.isArray(job.warnings) ? job.warnings : [],
      errors: Array.isArray(job.errors) ? job.errors : [],
      metadata: job.metadata ?? null,
      undoOfJobId: job.undoOfJobId,
      undoneAt: job.undoneAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private async applyRestoreForJob(sourceJobId: number) {
    const sourceJob = await this.prisma.importJob.findUnique({ where: { id: sourceJobId } });
    if (!sourceJob) throw new NotFoundException('Importacion no encontrada.');

    if (sourceJob.type === 'REPLENISHMENT') {
      const movements = await this.prisma.replenishmentMovement.findMany({
        where: { jobId: sourceJobId },
      });

      await this.prisma.$transaction(async (tx) => {
        for (const movement of movements) {
          const item = await tx.replenishmentItem.findUnique({ where: { sku: movement.sku } });
          const currentQty = Number(item?.quantity ?? 0);
          const nextQty = Math.max(0, currentQty - Number(movement.delta));

          if (!item && nextQty === 0) {
            continue;
          }

          if (!item) {
            await tx.replenishmentItem.create({
              data: {
                sku: movement.sku,
                name: movement.sku,
                quantity: 0,
                status: 'REPLENISHED',
                replenishedAt: new Date(),
              },
            });
            continue;
          }

          await tx.replenishmentItem.update({
            where: { sku: movement.sku },
            data: {
              quantity: nextQty,
              status: nextQty > 0 ? 'PENDING' : 'REPLENISHED',
              replenishedAt: nextQty > 0 ? null : new Date(),
            },
          });
        }
      });
      return;
    }

    const snapshots = await this.prisma.importSnapshot.findMany({ where: { jobId: sourceJobId } });
    if (snapshots.length === 0) {
      throw new BadRequestException('La importacion no tiene snapshot para restaurar.');
    }

    for (const snapshot of snapshots) {
      if (snapshot.domainType === 'PRODUCTS') {
        const products = (snapshot.data as Array<Record<string, unknown>>) ?? [];
        await this.prisma.$transaction(async (tx) => {
          await tx.product.deleteMany();
          if (products.length > 0) {
            await tx.product.createMany({ data: products as any });
          }
        });
      }

      if (snapshot.domainType === 'PRICE_LIST') {
        const list = await this.prisma.priceList.findUnique({ where: { code: snapshot.scopeKey ?? '' } });
        if (!list) continue;
        const items = (snapshot.data as Array<Record<string, unknown>>) ?? [];

        await this.prisma.$transaction(async (tx) => {
          await tx.priceListItem.deleteMany({ where: { priceListId: list.id } });
          if (items.length > 0) {
            await tx.priceListItem.createMany({ data: items as any });
          }
        });
      }

      if (snapshot.domainType === 'SUPPLIERS') {
        const suppliers = (snapshot.data as Array<Record<string, unknown>>) ?? [];
        await this.prisma.$transaction(async (tx) => {
          await tx.supplier.deleteMany();
          if (suppliers.length > 0) {
            await tx.supplier.createMany({ data: suppliers as any });
          }
        });
      }
    }
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
      throw new BadRequestException('El texto debe incluir encabezados y al menos una fila.');
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

  private normalizePurchaseRows(headers: string[], rows: Record<string, unknown>[]) {
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
      throw new BadRequestException('No se pudo identificar una columna SKU/Codigo o Nombre.');
    }
    if (!costKey) {
      throw new BadRequestException('No se pudo identificar una columna de costo/precio.');
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
        result.errors.push(`Fila ${rowNum}: costo invalido (${sku || name}).`);
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
