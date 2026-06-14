import { DataSource } from 'typeorm';

import { runSeeders } from 'typeorm-extension';
import { Logger } from '@nestjs/common';
import { UserSeeder } from './seeds/user.seed';
import AppDataSource from '@/data-source';

async function main() {
  let source: DataSource | undefined;

  try {
    source = await AppDataSource.initialize();
    Logger.log('Data Source has been initialized');
    await runSeeders(source, {
      seeds: [UserSeeder],
    });
    Logger.log('Seeders executed successfully');
  } catch (error) {
    Logger.error('Error during execution:', error);
  } finally {
    if (source) await source.destroy();
    Logger.log('Connection closed');
  }
}

main();
