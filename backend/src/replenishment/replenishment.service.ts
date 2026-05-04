import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

interface ReplenishmentQuery {
  search?: string;
  category?: string;
  subcategory?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class ReplenishmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPending(query: ReplenishmentQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ReplenishmentItemWhereInput = {
      status: 'PENDING',
      quantity: { gt: 0 },
    };

    if (query.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const productWhere: Prisma.ProductWhereInput = {};
    if (query.category) {
      productWhere.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.subcategory) {
      productWhere.subcategory = {
        equals: query.subcategory,
        mode: 'insensitive',
      };
    }

    if (Object.keys(productWhere).length > 0) {
      where.product = productWhere;
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder ?? 'asc');
    const total = await this.prisma.replenishmentItem.count({ where });
    const items = await this.prisma.replenishmentItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        product: {
          select: {
            category: true,
            subcategory: true,
          },
        },
      },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: Number(item.quantity),
        category: item.product.category,
        subcategory: item.product.subcategory,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilters() {
    const pending = {
      replenishmentItem: {
        is: {
          status: 'PENDING',
          quantity: { gt: 0 },
        },
      },
    };

    const [categories, subcategories] = await Promise.all([
      this.prisma.product.findMany({
        distinct: ['category'],
        select: { category: true },
        where: { category: { not: null }, ...pending },
        orderBy: { category: 'asc' },
      }),
      this.prisma.product.findMany({
        distinct: ['subcategory'],
        select: { subcategory: true },
        where: { subcategory: { not: null }, ...pending },
        orderBy: { subcategory: 'asc' },
      }),
    ]);

    return {
      categories: categories.map((item) => item.category).filter(Boolean),
      subcategories: subcategories
        .map((item) => item.subcategory)
        .filter(Boolean),
    };
  }

  async markReplenished(id: number) {
    const item = await this.prisma.replenishmentItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item de reposicion no encontrado.');
    }

    return this.prisma.replenishmentItem.update({
      where: { id },
      data: {
        quantity: 0,
        status: 'REPLENISHED',
        replenishedAt: new Date(),
      },
    });
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.ReplenishmentItemOrderByWithRelationInput {
    if (sortBy === 'category') {
      return { product: { category: sortOrder } };
    }
    if (sortBy === 'subcategory') {
      return { product: { subcategory: sortOrder } };
    }
    if (['sku', 'name', 'quantity'].includes(sortBy ?? '')) {
      return { [sortBy as string]: sortOrder };
    }
    return { name: 'asc' };
  }
}
