import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

interface SuppliersQuery {
  search?: string;
  personeria?: string;
  categoriaImpositiva?: string;
  provincia?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuppliers(query: SuppliersQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (query.search) {
      where.OR = [
        { razonSocial: { contains: query.search, mode: 'insensitive' } },
        { nombreFantasia: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { documento: { contains: query.search, mode: 'insensitive' } },
        { ciudad: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.personeria) {
      where.personeria = { equals: query.personeria, mode: 'insensitive' };
    }
    if (query.categoriaImpositiva) {
      where.categoriaImpositiva = {
        equals: query.categoriaImpositiva,
        mode: 'insensitive',
      };
    }
    if (query.provincia) {
      where.provincia = { equals: query.provincia, mode: 'insensitive' };
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder ?? 'asc');
    const total = await this.prisma.supplier.count({ where });

    const rows = await this.prisma.supplier.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilters() {
    const [personerias, categorias, provincias] = await Promise.all([
      this.prisma.supplier.findMany({
        distinct: ['personeria'],
        select: { personeria: true },
        where: { personeria: { not: null } },
        orderBy: { personeria: 'asc' },
      }),
      this.prisma.supplier.findMany({
        distinct: ['categoriaImpositiva'],
        select: { categoriaImpositiva: true },
        where: { categoriaImpositiva: { not: null } },
        orderBy: { categoriaImpositiva: 'asc' },
      }),
      this.prisma.supplier.findMany({
        distinct: ['provincia'],
        select: { provincia: true },
        where: { provincia: { not: null } },
        orderBy: { provincia: 'asc' },
      }),
    ]);

    return {
      personerias: personerias.map((item) => item.personeria).filter(Boolean),
      categoriasImpositivas: categorias
        .map((item) => item.categoriaImpositiva)
        .filter(Boolean),
      provincias: provincias.map((item) => item.provincia).filter(Boolean),
    };
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.SupplierOrderByWithRelationInput {
    const sortable: Array<keyof Prisma.SupplierOrderByWithRelationInput> = [
      'razonSocial',
      'nombreFantasia',
      'code',
      'personeria',
      'documento',
      'categoriaImpositiva',
      'provincia',
      'ciudad',
    ];

    if (sortBy && sortable.includes(sortBy as keyof Prisma.SupplierOrderByWithRelationInput)) {
      return { [sortBy]: sortOrder };
    }

    return { razonSocial: 'asc' };
  }
}
