import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getConfig } from '../services/app-config/configuration';
import { seedAdmin } from './seeders/admin.seeder';

dotenv.config();

async function runSeedAdmin() {
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
    await seedAdmin(dataSource);
    console.log('Admin seed completed');
  } finally {
    await dataSource.destroy();
  }
}

runSeedAdmin().catch((err) => {
  console.error('Admin seed failed:', err);
  process.exit(1);
});
