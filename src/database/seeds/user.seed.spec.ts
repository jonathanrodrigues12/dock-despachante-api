import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserSeeder } from './user.seed';
import { Role } from '@/common/entity/rolebase';
import { User } from '@/users/users.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('UserSeeder', () => {
  let seeder: UserSeeder;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOneBy' | 'save'>>;

  beforeEach(() => {
    seeder = new UserSeeder();
    userRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    };
  });

  it('should create admin user when it does not exist', async () => {
    userRepository.findOneBy.mockResolvedValue(null);
    userRepository.save.mockResolvedValue([] as any);

    await seeder.seed(userRepository as any);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'admin@example.com' });
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Admin',
          surname: 'System',
          email: 'admin@example.com',
          password: 'hashed_password',
          role: Role.ADMIN,
          isActive: true,
          provider: 'local',
        }),
      ]),
    );
  });

  it('should skip user if it already exists', async () => {
    userRepository.findOneBy.mockResolvedValue({ id: '1', email: 'admin@example.com' } as User);

    await seeder.seed(userRepository as any);

    expect(userRepository.save).toHaveBeenCalledWith([]);
  });

  it('should call seed via run using dataSource', async () => {
    const mockRepo = { findOneBy: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const mockDataSource = { getRepository: jest.fn().mockReturnValue(mockRepo) } as any;

    await seeder.run(mockDataSource, {} as any);

    expect(mockDataSource.getRepository).toHaveBeenCalledWith(User);
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
