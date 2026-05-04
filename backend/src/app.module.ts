import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma';
import { ImportsModule } from './imports/imports.module';
import { ProductsModule } from './products/products.module';
import { ReplenishmentModule } from './replenishment/replenishment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ImportsModule,
    ProductsModule,
    ReplenishmentModule,
  ],
})
export class AppModule {}
