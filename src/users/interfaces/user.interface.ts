import { User } from '../users.entity';
import { SearchUserParams } from './user.interface.dto';
export interface IUserRepository {
  save(userData: Partial<User>, requestBy?: string): Promise<User>;
  findOne(id: string): Promise<User | null>;
  checkIfExistsEmail(email: string): Promise<boolean>;
  findAndDelete(id: string, requestBy: string): Promise<boolean>;
  update(id: string, userData: Partial<User>, requestBy?: string): Promise<User | null>;
  findAndCount(params: SearchUserParams): Promise<[User[], number]>;
  findByEmail(email: string): Promise<User | null>;
}
