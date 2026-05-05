import { Controller, Get, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async getSuppliers(
    @Query('search') search?: string,
    @Query('personeria') personeria?: string,
    @Query('categoriaImpositiva') categoriaImpositiva?: string,
    @Query('provincia') provincia?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.getSuppliers({
      search,
      personeria,
      categoriaImpositiva,
      provincia,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.suppliersService.getFilters();
  }
}
