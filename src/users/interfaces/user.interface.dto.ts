import { FindOptionsWhere } from 'typeorm';
import { User } from '../users.entity';
import { ParamsPagination } from '@/common/paginations/params-pagination';

export interface SearchUserParams extends ParamsPagination {
  where?: FindOptionsWhere<User>[];
}
