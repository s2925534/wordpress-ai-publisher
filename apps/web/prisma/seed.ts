import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.localSetting.upsert({
    where: { key: 'bootstrap.version' },
    update: { value: 'phase-1' },
    create: {
      key: 'bootstrap.version',
      value: 'phase-1'
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
