import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '@prisma/client';

interface UnifiedQuery {
  search?: string;
  category?: string;
  subcategory?: string;
  supplier?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface UnifiedProduct {
  id: number;
  sku: string;
  type: string;
  name: string;
  barcode: string | null;
  status: string;
  internalCost: number;
  basePrice: number;
  finalPrice: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  visibleInSales: boolean;
  category: string | null;
  subcategory: string | null;
  supplier: string | null;
  priceBodeguita: number;
  priceDistribuidoraMayorista: number;
}

interface UnifiedResponse {
  data: UnifiedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SkuRangeRule {
  id: number;
  name: string;
  min: number;
  max: number;
}

export interface SkuAvailability {
  ruleId: number;
  ruleName: string;
  min: number;
  max: number;
  usedCount: number;
  availableCount: number;
  availableSkus: number[];
}

export interface SkuMismatch {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  expectedRuleId: number | null;
  expectedRuleName: string | null;
  expectedMin: number | null;
  expectedMax: number | null;
  parsedSku: number | null;
  reason: 'NON_NUMERIC_SKU' | 'OUT_OF_RANGE' | 'UNKNOWN_CATEGORY';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  private static readonly WITHOUT_SUPPLIER_FILTER = '__WITHOUT_SUPPLIER__';

  private toWhereArray(
    value: Prisma.ProductWhereInput | Prisma.ProductWhereInput[] | undefined,
  ): Prisma.ProductWhereInput[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private readonly skuRangeRules: SkuRangeRule[] = [
    { id: 1, name: 'CERVEZAS', min: 100, max: 199 },
    { id: 2, name: 'APERITIVOS', min: 200, max: 299 },
    { id: 3, name: 'ESPUMANTES Y CHAMPAGNE', min: 300, max: 399 },
    { id: 4, name: 'GASEOSAS, ENERGIZANTES, AGUAS Y JUGOS', min: 400, max: 499 },
    { id: 5, name: 'WHISKY', min: 500, max: 599 },
    { id: 6, name: 'GIN', min: 600, max: 699 },
    { id: 7, name: 'VODKA', min: 700, max: 799 },
    { id: 8, name: 'RON, TEQUILA Y LICORES', min: 800, max: 899 },
    { id: 9, name: 'PROMOS Y COMBOS', min: 900, max: 999 },
    { id: 10, name: 'VINOS', min: 1000, max: 1999 },
    { id: 20, name: 'REGALERIA Y MERCHANDISING', min: 2000, max: 2999 },
  ];

  private normalizeText(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private resolveRuleByCategory(category: string | null): SkuRangeRule | null {
    const normalized = this.normalizeText(category);
    if (!normalized) return null;

    if (normalized.includes('CERVEZA')) return this.skuRangeRules.find((r) => r.id === 1) ?? null;
    if (normalized.includes('APERITIVO')) return this.skuRangeRules.find((r) => r.id === 2) ?? null;
    if (normalized.includes('ESPUMANTE') || normalized.includes('CHAMPAGNE')) {
      return this.skuRangeRules.find((r) => r.id === 3) ?? null;
    }
    if (
      normalized.includes('GASEOSA') ||
      normalized.includes('ENERGIZANTE') ||
      normalized.includes('AGUA') ||
      normalized.includes('JUGO')
    ) {
      return this.skuRangeRules.find((r) => r.id === 4) ?? null;
    }
    if (normalized.includes('WHISKY')) return this.skuRangeRules.find((r) => r.id === 5) ?? null;
    if (normalized.includes('GIN')) return this.skuRangeRules.find((r) => r.id === 6) ?? null;
    if (normalized.includes('VODKA')) return this.skuRangeRules.find((r) => r.id === 7) ?? null;
    if (
      normalized.includes('RON') ||
      normalized.includes('TEQUILA') ||
      normalized.includes('LICOR')
    ) {
      return this.skuRangeRules.find((r) => r.id === 8) ?? null;
    }
    if (normalized.includes('PROMO') || normalized.includes('COMBO')) {
      return this.skuRangeRules.find((r) => r.id === 9) ?? null;
    }
    if (normalized.includes('VINO')) return this.skuRangeRules.find((r) => r.id === 10) ?? null;
    if (
      normalized.includes('REGALERIA') ||
      normalized.includes('MERCHANDISING') ||
      normalized.includes('MERCH')
    ) {
      return this.skuRangeRules.find((r) => r.id === 20) ?? null;
    }

    return null;
  }

  async getUnified(query: UnifiedQuery): Promise<UnifiedResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      const search = query.search;
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.subcategory) {
      where.subcategory = { equals: query.subcategory, mode: 'insensitive' };
    }
    if (query.supplier) {
      if (query.supplier === ProductsService.WITHOUT_SUPPLIER_FILTER) {
        where.AND = [
          ...this.toWhereArray(where.AND),
          {
            OR: [{ supplier: null }, { supplier: '' }],
          },
        ];
      } else {
        where.supplier = { equals: query.supplier, mode: 'insensitive' };
      }
    }
    if (query.type) {
      where.type = { equals: query.type, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = { equals: query.status, mode: 'insensitive' };
    }

    // Build order
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (query.sortBy) {
      const validSortFields = [
        'sku',
        'name',
        'type',
        'status',
        'internalCost',
        'finalPrice',
        'stock',
        'category',
        'subcategory',
      ];
      if (validSortFields.includes(query.sortBy)) {
        orderBy[query.sortBy] = query.sortOrder ?? 'asc';
      }
    } else {
      orderBy.sku = 'asc';
    }

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Get products
    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    // Get price lists
    const [bodeguita, distribuidora] = await Promise.all([
      this.prisma.priceList.findUnique({ where: { code: 'BODEGUITA' } }),
      this.prisma.priceList.findUnique({
        where: { code: 'DISTRIBUIDORA_MAYORISTA' },
      }),
    ]);

    // Get price list items for these products
    const skus = products.map((p) => p.sku);

    const [bodeguitaItems, distribuidoraItems] = await Promise.all([
      bodeguita
        ? this.prisma.priceListItem.findMany({
            where: { priceListId: bodeguita.id, sku: { in: skus } },
          })
        : [],
      distribuidora
        ? this.prisma.priceListItem.findMany({
            where: { priceListId: distribuidora.id, sku: { in: skus } },
          })
        : [],
    ]);

    // Build lookup maps
    const bodeguitaMap = new Map<string, number>(
      bodeguitaItems.map((item) => [item.sku, Number(item.finalPrice)] as [string, number]),
    );
    const distribuidoraMap = new Map<string, number>(
      distribuidoraItems.map((item) => [item.sku, Number(item.finalPrice)] as [string, number]),
    );

    // Build unified response
    const data: UnifiedProduct[] = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      type: p.type,
      name: p.name,
      barcode: p.barcode,
      status: p.status,
      internalCost: Number(p.internalCost),
      basePrice: Number(p.basePrice),
      finalPrice: Number(p.finalPrice),
      stock: Number(p.stock),
      reservedStock: Number(p.reservedStock),
      availableStock: Number(p.availableStock),
      visibleInSales: p.visibleInSales,
      category: p.category,
      subcategory: p.subcategory,
      supplier: p.supplier,
      priceBodeguita: bodeguitaMap.get(p.sku) ?? 0,
      priceDistribuidoraMayorista: distribuidoraMap.get(p.sku) ?? 0,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns distinct values for filter dropdowns.
   */
  async getFilterOptions() {
    const [categories, subcategories, types, statuses, rawProductSuppliers, supplierRows] = await Promise.all([
      this.prisma.product.findMany({
        distinct: ['category'],
        select: { category: true },
        where: { category: { not: null } },
        orderBy: { category: 'asc' },
      }),
      this.prisma.product.findMany({
        distinct: ['subcategory'],
        select: { subcategory: true },
        where: { subcategory: { not: null } },
        orderBy: { subcategory: 'asc' },
      }),
      this.prisma.product.findMany({
        distinct: ['type'],
        select: { type: true },
        orderBy: { type: 'asc' },
      }),
      this.prisma.product.findMany({
        distinct: ['status'],
        select: { status: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.product.findMany({
        distinct: ['supplier'],
        select: { supplier: true },
        where: { supplier: { not: null } },
        orderBy: { supplier: 'asc' },
      }),
      this.prisma.supplier.findMany({
        select: { razonSocial: true },
        orderBy: { razonSocial: 'asc' },
      }),
    ]);

    const normalizedProductSupplierMap = new Map<string, string>();
    for (const row of rawProductSuppliers) {
      const name = row.supplier?.trim();
      if (!name) continue;
      normalizedProductSupplierMap.set(this.normalizeText(name), name);
    }

    const connectedSuppliers: string[] = [];
    for (const row of supplierRows) {
      const supplierName = row.razonSocial?.trim();
      if (!supplierName) continue;
      const normalized = this.normalizeText(supplierName);
      if (normalizedProductSupplierMap.has(normalized)) {
        connectedSuppliers.push(supplierName);
        normalizedProductSupplierMap.delete(normalized);
      }
    }

    const unmatchedProductSuppliers = Array.from(normalizedProductSupplierMap.values()).sort((a, b) =>
      a.localeCompare(b, 'es-AR', { sensitivity: 'base' }),
    );

    return {
      categories: categories.map((c) => c.category).filter(Boolean),
      subcategories: subcategories.map((s) => s.subcategory).filter(Boolean),
      types: types.map((t) => t.type),
      statuses: statuses.map((s) => s.status),
      suppliers: [...connectedSuppliers, ...unmatchedProductSuppliers],
      withoutSupplierFilterValue: ProductsService.WITHOUT_SUPPLIER_FILTER,
    };
  }

  async getSkuCodesOverview(ruleId?: number) {
    const rules = ruleId
      ? this.skuRangeRules.filter((rule) => rule.id === ruleId)
      : this.skuRangeRules;

    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
      },
      orderBy: { sku: 'asc' },
    });

    const numericSkus = new Set<number>();
    for (const product of products) {
      const parsed = Number.parseInt(product.sku, 10);
      if (Number.isInteger(parsed)) {
        numericSkus.add(parsed);
      }
    }

    const availability: SkuAvailability[] = rules.map((rule) => {
      const availableSkus: number[] = [];
      let usedCount = 0;

      for (let sku = rule.min; sku <= rule.max; sku += 1) {
        if (numericSkus.has(sku)) {
          usedCount += 1;
        } else {
          availableSkus.push(sku);
        }
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        min: rule.min,
        max: rule.max,
        usedCount,
        availableCount: availableSkus.length,
        availableSkus,
      };
    });

    const mismatches: SkuMismatch[] = [];
    for (const product of products) {
      const expectedRule = this.resolveRuleByCategory(product.category);
      const parsedSku = Number.parseInt(product.sku, 10);
      const numericSku = Number.isInteger(parsedSku) ? parsedSku : null;

      if (!expectedRule) {
        mismatches.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          expectedRuleId: null,
          expectedRuleName: null,
          expectedMin: null,
          expectedMax: null,
          parsedSku: numericSku,
          reason: 'UNKNOWN_CATEGORY',
        });
        continue;
      }

      if (!numericSku) {
        mismatches.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          expectedRuleId: expectedRule.id,
          expectedRuleName: expectedRule.name,
          expectedMin: expectedRule.min,
          expectedMax: expectedRule.max,
          parsedSku: null,
          reason: 'NON_NUMERIC_SKU',
        });
        continue;
      }

      if (numericSku < expectedRule.min || numericSku > expectedRule.max) {
        mismatches.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          expectedRuleId: expectedRule.id,
          expectedRuleName: expectedRule.name,
          expectedMin: expectedRule.min,
          expectedMax: expectedRule.max,
          parsedSku: numericSku,
          reason: 'OUT_OF_RANGE',
        });
      }
    }

    const filteredMismatches = ruleId
      ? mismatches.filter((item) => item.expectedRuleId === ruleId)
      : mismatches;

    return {
      rules: this.skuRangeRules,
      availability,
      mismatches: filteredMismatches,
      totals: {
        mismatches: filteredMismatches.length,
      },
    };
  }
}
