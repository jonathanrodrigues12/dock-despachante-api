import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './users.entity';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponse, PaginationResponse } from '../common/paginations/paginationResponse';
import { PoliciesGuard } from '../casl/guard/policies.guard';
import { CheckPolicies } from '../casl/guard/check-policies';
import { AppAbility } from '../casl/casl-ability.factory';
import { Action } from '../common/entity/actionbase';
import { ParamsPagination } from '@/common/paginations/params-pagination';
import { CurrentUser } from '@/jwt/current-user.decorator';
import { IJwtPayload } from '@/jwt/jwt.strategy';

@UseGuards(PoliciesGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create a new user.' })
  @ApiOkResponse({ description: 'Create a new user', type: User })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.CREATE, User))
  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() { userId: requestBy }: IJwtPayload,
  ): Promise<User> {
    return this.userService.create(createUserDto, requestBy);
  }

  @ApiOperation({ summary: 'Get one user.' })
  @ApiOkResponse({ description: 'Get one user', type: User })
  @Get(':id')
  async findOneUser(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Delete a user.' })
  @ApiOkResponse({ description: 'Delete a user', type: Boolean })
  @Delete(':id')
  async DeleteUser(
    @Param('id') id: string,
    @CurrentUser() { userId: requestBy }: IJwtPayload,
  ): Promise<boolean> {
    return this.userService.deleted(id, requestBy);
  }

  @ApiOperation({ summary: 'Update an existing user by ID.' })
  @ApiOkResponse({ description: 'Returns the updated user entity.', type: User })
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() { userId: requestBy }: IJwtPayload,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto, requestBy);
  }

  @ApiOperation({ summary: 'Check if email exists in use' })
  @ApiOkResponse({ description: 'Check if email exists in use', type: Boolean })
  @Get('check/:email')
  async checkIfExistsEmail(@Param('email') email: string): Promise<boolean> {
    return this.userService.checkIfExistsEmail(email);
  }

  @ApiOperation({ summary: 'Get all user.' })
  @PaginatedResponse(User)
  @Get()
  async getAllUsers(@Query() params: ParamsPagination): Promise<PaginationResponse<User>> {
    const { page, perPage } = params;
    const [users, total] = await this.userService.findAll(params);
    return {
      data: users,
      meta: {
        page,
        perPage,
        total,
      },
    };
  }
}
