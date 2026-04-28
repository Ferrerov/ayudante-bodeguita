import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding price lists...');

  await prisma.priceList.upsert({
    where: { code: 'BODEGUITA' },
    update: {},
    create: {
      code: 'BODEGUITA',
      name: 'Bodeguita',
    },
  });

  await prisma.priceList.upsert({
    where: { code: 'DISTRIBUIDORA_MAYORISTA' },
    update: {},
    create: {
      code: 'DISTRIBUIDORA_MAYORISTA',
      name: 'Distribuidora Mayorista',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
