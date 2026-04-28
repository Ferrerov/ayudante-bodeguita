import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('unified')
  async getUnified(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.productsService.getUnified({
      search,
      category,
      subcategory,
      type,
      status,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.productsService.getFilterOptions();
  }

  @Get('sku-codes')
  async getSkuCodes(@Query('ruleId') ruleId?: string) {
    const parsedRuleId = ruleId ? parseInt(ruleId, 10) : undefined;
    return this.productsService.getSkuCodesOverview(
      Number.isNaN(parsedRuleId) ? undefined : parsedRuleId,
    );
  }
}
