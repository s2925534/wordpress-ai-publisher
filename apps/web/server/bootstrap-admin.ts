import { prisma } from '../lib/prisma';
import { AuthService } from './auth-service';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Admin bootstrap skipped: ADMIN_EMAIL/ADMIN_PASSWORD not set.');
    return;
  }

  const authService = new AuthService({ prisma });
  const created = await authService.ensureBootstrapAdmin(email, password);

  if (created) {
    console.log(`Bootstrapped first admin user: ${email}`);
  } else {
    console.log('Admin bootstrap skipped: a user already exists.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
