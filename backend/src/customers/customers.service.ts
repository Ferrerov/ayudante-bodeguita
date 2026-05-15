import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

interface CustomersQuery {
  search?: string;
  personeria?: string;
  categoriaImpositiva?: string;
  provincia?: string;
  vendedorAsignado?: string;
  listaPrecio?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  private static readonly WITHOUT_LISTA_PRECIO_FILTER =
    '__WITHOUT_LISTA_PRECIO__';

  constructor(private readonly prisma: PrismaService) {}

  async getCustomers(query: CustomersQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (query.search) {
      where.OR = [
        { razonSocial: { contains: query.search, mode: 'insensitive' } },
        { nombreFantasia: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { documento: { contains: query.search, mode: 'insensitive' } },
        { ciudad: { contains: query.search, mode: 'insensitive' } },
        { vendedorAsignado: { contains: query.search, mode: 'insensitive' } },
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
    if (query.vendedorAsignado) {
      where.vendedorAsignado = {
        equals: query.vendedorAsignado,
        mode: 'insensitive',
      };
    }
    if (query.listaPrecio) {
      if (query.listaPrecio === CustomersService.WITHOUT_LISTA_PRECIO_FILTER) {
        where.AND = [{ OR: [{ listaPrecio: null }, { listaPrecio: '' }] }];
      } else {
        where.listaPrecio = {
          equals: query.listaPrecio,
          mode: 'insensitive',
        };
      }
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder ?? 'asc');
    const total = await this.prisma.customer.count({ where });

    const rows = await this.prisma.customer.findMany({
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
    const [personerias, categorias, provincias, vendedores, listasPrecio] = await Promise.all([
      this.prisma.customer.findMany({
        distinct: ['personeria'],
        select: { personeria: true },
        where: { personeria: { not: null } },
        orderBy: { personeria: 'asc' },
      }),
      this.prisma.customer.findMany({
        distinct: ['categoriaImpositiva'],
        select: { categoriaImpositiva: true },
        where: { categoriaImpositiva: { not: null } },
        orderBy: { categoriaImpositiva: 'asc' },
      }),
      this.prisma.customer.findMany({
        distinct: ['provincia'],
        select: { provincia: true },
        where: { provincia: { not: null } },
        orderBy: { provincia: 'asc' },
      }),
      this.prisma.customer.findMany({
        distinct: ['vendedorAsignado'],
        select: { vendedorAsignado: true },
        where: { vendedorAsignado: { not: null } },
        orderBy: { vendedorAsignado: 'asc' },
      }),
      this.prisma.customer.findMany({
        distinct: ['listaPrecio'],
        select: { listaPrecio: true },
        where: { listaPrecio: { not: null } },
        orderBy: { listaPrecio: 'asc' },
      }),
    ]);

    return {
      personerias: personerias.map((item) => item.personeria).filter(Boolean),
      categoriasImpositivas: categorias
        .map((item) => item.categoriaImpositiva)
        .filter(Boolean),
      provincias: provincias.map((item) => item.provincia).filter(Boolean),
      vendedoresAsignados: vendedores
        .map((item) => item.vendedorAsignado)
        .filter(Boolean),
      listasPrecio: listasPrecio.map((item) => item.listaPrecio).filter(Boolean),
      withoutListaPrecioFilterValue:
        CustomersService.WITHOUT_LISTA_PRECIO_FILTER,
    };
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.CustomerOrderByWithRelationInput {
    const sortable: Array<keyof Prisma.CustomerOrderByWithRelationInput> = [
      'razonSocial',
      'nombreFantasia',
      'personeria',
      'documento',
      'categoriaImpositiva',
      'provincia',
      'ciudad',
      'listaPrecio',
      'limiteDescubierto',
      'descuentoFijo',
      'vendedorAsignado',
    ];

    if (
      sortBy &&
      sortable.includes(sortBy as keyof Prisma.CustomerOrderByWithRelationInput)
    ) {
      return { [sortBy]: sortOrder };
    }

    return { razonSocial: 'asc' };
  }
}
