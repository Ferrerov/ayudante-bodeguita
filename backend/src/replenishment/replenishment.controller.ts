import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReplenishmentService } from './replenishment.service';

@Controller('replenishment')
export class ReplenishmentController {
  constructor(private readonly replenishmentService: ReplenishmentService) {}

  @Get()
  async getPending(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.replenishmentService.getPending({
      search,
      category,
      subcategory,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.replenishmentService.getFilters();
  }

  @Patch(':id/replenished')
  async markReplenished(@Param('id') id: string) {
    return this.replenishmentService.markReplenished(parseInt(id, 10));
  }

  @Patch(':id/quantity')
  async updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity?: number | string,
  ) {
    return this.replenishmentService.updateQuantity(
      parseInt(id, 10),
      Number(quantity),
    );
  }

  @Post('manual')
  async addManual(
    @Body('sku') sku?: string,
    @Body('quantity') quantity?: number | string,
  ) {
    return this.replenishmentService.addManual({
      sku: String(sku ?? ''),
      quantity: Number(quantity),
    });
  }
}
