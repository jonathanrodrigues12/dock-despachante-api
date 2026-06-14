import { Role } from '@/common/entity/rolebase';
import { User } from '@/users/users.entity';

import { fakerPT_BR as faker } from '@faker-js/faker';

export function makeUser(override: Partial<User> = {}): User {
  const user = new User();

  Object.assign(user, {
    name: faker.person.firstName(),
    surname: faker.person.lastName(),
    photo_url: faker.image.avatar(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 20, prefix: 'Password123!' }),
    isActive: true,
    role: faker.helpers.arrayElement(Object.values(Role)),
    provider: 'local',
    ...override,
  });

  return user;
}
