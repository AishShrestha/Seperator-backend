import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getConfig } from '../services/app-config/configuration';
import { seedPlans } from './seeders/plan.seeder';
import { seedAdmin } from './seeders/admin.seeder';

// Match type-orm.config.ts loading - use default .env
dotenv.config();

async function runSeed() {
  const { database } = getConfig();
  const dataSource = new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.user,
    password: database.password,
    database: database.dbName,
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  await dataSource.initialize();
  try {
    await seedPlans(dataSource);
    await seedAdmin(dataSource);
    console.log('Seed completed successfully');
  } finally {
    await dataSource.destroy();
  }
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
