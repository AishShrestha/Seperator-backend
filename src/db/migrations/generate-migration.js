const { execSync } = require('child_process');
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Migration name is required');
  process.exit(1);
}

execSync(
  `yarn typeorm migration:generate ./src/db/migrations/${migrationName} -d ./type-orm.config.ts`,
  { stdio: 'inherit' },
);
