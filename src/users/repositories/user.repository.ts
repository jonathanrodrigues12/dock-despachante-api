import { Injectable } from '@nestjs/common';
import { User } from '../users.entity';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SearchUserParams } from '../interfaces/user.interface.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async save(userData: Partial<User>, requestBy?: string): Promise<User> {
    const user = this.repository.create({
      ...userData,
      ...(requestBy ? { created_by: { id: requestBy } } : {}),
    });
    return this.repository.save(user);
  }

  async findOne(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async checkIfExistsEmail(email: string): Promise<boolean> {
    const user = await this.repository.findOne({ where: { email } });
    return !!user;
  }
  async findAndDelete(id: string, requestBy: string): Promise<boolean> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) return false;
    await this.repository.update(user.id, {
      deleted_at: new Date(),
      deleted_by: { id: requestBy },
    });
    return true;
  }

  async update(id: string, userData: Partial<User>, requestBy?: string): Promise<User | null> {
    await this.repository.update(id, {
      ...userData,
      ...(requestBy ? { updated_by: { id: requestBy } } : {}),
    });
    return this.findOne(id);
  }
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.repository.findOne({ where: { email } });
    return user;
  }

  async findAndCount(params: SearchUserParams): Promise<[User[], number]> {
    const { page = 1, perPage = 10, search, where: defaultWhere } = params;
    let where: FindOptionsWhere<User>[] = defaultWhere ? defaultWhere : [];

    if (search) {
      if (isUUID(search)) {
        where.push({ id: search });
      }

      where.push(
        { name: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) },
        { surname: ILike(`%${search}%`) },
      );
    }

    return await this.repository.findAndCount({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      order: { created_at: 'DESC' },
    });
  }
}
