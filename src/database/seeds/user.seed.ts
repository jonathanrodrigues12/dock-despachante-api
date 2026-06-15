import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import * as bcrypt from 'bcrypt';
import { Role } from '@/common/entity/rolebase';
import { User } from '@/users/users.entity';

const SEED_USERS = [
  {
    name: 'Admin',
    surname: 'System',
    email: 'admin@example.com',
    password: 'Password123!',
    role: Role.ADMIN,
  },
];

export class UserSeeder implements Seeder {
  async run(dataSource: DataSource, _factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    await this.seed(userRepository);
  }

  async seed(userRepository: Repository<User>): Promise<void> {
    const newUsers: User[] = [];

    for (const data of SEED_USERS) {
      const exists = await userRepository.findOneBy({ email: data.email });
      if (exists) continue;

      const user = new User();
      Object.assign(user, {
        name: data.name,
        surname: data.surname,
        email: data.email,
        password: await bcrypt.hash(data.password, 10),
        role: data.role,
        isActive: true,
        provider: 'local',
      });

      newUsers.push(user);
    }

    await userRepository.save(newUsers);
  }
}
