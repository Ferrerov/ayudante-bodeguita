import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('jobs')
  async getJobs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importsService.getJobs({
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.importsService.getJob(parseInt(id, 10));
  }

  @Post('jobs/:id/undo')
  async undoJob(@Param('id') id: string) {
    return this.importsService.undoJob(parseInt(id, 10));
  }

  @Post('jobs/:id/restore')
  async restoreJob(@Param('id') id: string) {
    return this.importsService.restoreJob(parseInt(id, 10));
  }

  @Post('purchase-review/text')
  parsePurchaseFromText(@Body('text') text: string): any {
    if (!text || !String(text).trim()) {
      throw new BadRequestException('No se recibiÃ³ texto para procesar.');
    }

    return this.importsService.parsePurchaseReviewFromText(text);
  }

  @Post('purchase-review/file')
  @UseInterceptors(FileInterceptor('file'))
  parsePurchaseFromFile(@UploadedFile() file: Express.Multer.File): any {
    if (!file) {
      throw new BadRequestException('No se recibiÃ³ ningÃºn archivo.');
    }

    const lowerName = file.originalname.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isCsv = lowerName.endsWith('.csv');

    if (!isExcel && !isCsv) {
      throw new BadRequestException('El archivo debe ser .xlsx, .xls o .csv.');
    }

    return this.importsService.parsePurchaseReviewFromFile(
      file.buffer,
      file.originalname,
    );
  }

  @Post('products')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    if (
      !file.originalname.endsWith('.xlsx') &&
      !file.originalname.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'El archivo debe ser un archivo Excel (.xlsx).',
      );
    }

    return this.importsService.importProducts(file.buffer, file.originalname);
  }

  @Post('price-lists/bodeguita')
  @UseInterceptors(FileInterceptor('file'))
  async importBodeguita(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    if (
      !file.originalname.endsWith('.xlsx') &&
      !file.originalname.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'El archivo debe ser un archivo Excel (.xlsx).',
      );
    }

    return this.importsService.importPriceList(
      file.buffer,
      file.originalname,
      'BODEGUITA',
    );
  }

  @Post('replenishment')
  @UseInterceptors(FileInterceptor('file'))
  async importReplenishment(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo.');
    }

    if (
      !file.originalname.endsWith('.xlsx') &&
      !file.originalname.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'El archivo debe ser un archivo Excel (.xlsx).',
      );
    }

    return this.importsService.importReplenishment(
      file.buffer,
      file.originalname,
    );
  }

  @Post('suppliers')
  @UseInterceptors(FileInterceptor('file'))
  async importSuppliers(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo.');
    }

    if (
      !file.originalname.endsWith('.xlsx') &&
      !file.originalname.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'El archivo debe ser un archivo Excel (.xlsx).',
      );
    }

    return this.importsService.importSuppliers(file.buffer, file.originalname);
  }

  @Post('price-lists/distribuidora-mayorista')
  @UseInterceptors(FileInterceptor('file'))
  async importDistribuidoraMayorista(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    if (
      !file.originalname.endsWith('.xlsx') &&
      !file.originalname.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'El archivo debe ser un archivo Excel (.xlsx).',
      );
    }

    return this.importsService.importPriceList(
      file.buffer,
      file.originalname,
      'DISTRIBUIDORA_MAYORISTA',
    );
  }
}
