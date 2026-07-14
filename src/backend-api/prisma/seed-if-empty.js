const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const organizationCount = await prisma.organization.count();

  if (organizationCount > 0) {
    console.log('Database already contains data; skipping demo seed.');
    return;
  }

  const result = spawnSync(process.execPath, ['prisma/seed.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Demo seed exited with status ${result.status ?? 'unknown'}`);
  }
}

main()
  .catch((error) => {
    console.error('Conditional seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
