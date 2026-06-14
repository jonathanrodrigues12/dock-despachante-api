import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import * as bcrypt from 'bcrypt';
import { Role } from '@/common/entity/rolebase';
import { User } from '@/users/users.entity';
import { makeUser } from '@/testing/factories/make-user';


export class UserSeeder implements Seeder {
  async run(dataSource: DataSource, _factoryManager: SeederFactoryManager): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    await this.access(userRepository);
  }

  async access(userRepository: Repository<User>): Promise<void> {
    const users = [
      {
        email: 'admin@example.com',
        password: 'Password123!',
        role: Role.ADMIN,
      },
    ];

    const newUsers: User[] = [];
    for (const user of [...users]) {
      const existingUser = await userRepository.findOneBy({
        email: user.email,
      });

      if (!existingUser) {
        newUsers.push(
          makeUser({
            email: user.email,
            password: await bcrypt.hash(user.password, 10),
            role: user.role,
          }),
        );
      }
    }

    await userRepository.save(newUsers);
  }
}
