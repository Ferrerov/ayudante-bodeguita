import { Controller, Get, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async getCustomers(
    @Query('search') search?: string,
    @Query('personeria') personeria?: string,
    @Query('categoriaImpositiva') categoriaImpositiva?: string,
    @Query('provincia') provincia?: string,
    @Query('vendedorAsignado') vendedorAsignado?: string,
    @Query('listaPrecio') listaPrecio?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getCustomers({
      search,
      personeria,
      categoriaImpositiva,
      provincia,
      vendedorAsignado,
      listaPrecio,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.customersService.getFilters();
  }
}
