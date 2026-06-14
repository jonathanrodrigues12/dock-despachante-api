# NestJS Backend Patterns Reference

## Entity

```typescript
import { EntityBase } from '@/common/entity/entity-base';
import { Column, Entity } from 'typeorm';

@Entity('table_name')           // snake_case table name
export class MyEntity extends EntityBase {
  @Column({ length: 255 })
  name: string;

  @Column({ name: 'field_name' })  // snake_case in DB
  fieldName: string;               // camelCase in code

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
```

**Rules:**
- Always extend `EntityBase` (provides id, created_at, updated_at, deleted_at)
- Table names: `snake_case`
- DB columns: `{ name: 'snake_case' }` with camelCase TS property
- Soft delete via `deleted_at` — never hard delete

---

## DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeatureDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdateFeatureDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
```

**Rules:**
- All fields annotated with `@ApiProperty` for Swagger
- class-validator decorators with Portuguese error messages
- Separate `Create*Dto` and `Update*Dto`
- Files: `dto/create-[feature].dto.ts`, `dto/update-[feature].dto.ts`

---

## Controller

```typescript
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoliciesGuard } from '@/casl/guard/policies.guard';
import { FeatureService } from './feature.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeatureEntity } from './feature.entity';

@UseGuards(PoliciesGuard)
@ApiBearerAuth()
@ApiTags('feature-name')
@Controller('feature-name')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @ApiOperation({ summary: 'List all' })
  @ApiOkResponse({ type: [FeatureEntity] })
  @Get()
  async findAll(): Promise<FeatureEntity[]> {
    return this.featureService.findAll();
  }

  @ApiOperation({ summary: 'Get by id' })
  @ApiOkResponse({ type: FeatureEntity })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FeatureEntity> {
    return this.featureService.findOne(id);
  }

  @ApiOperation({ summary: 'Create' })
  @ApiOkResponse({ type: FeatureEntity })
  @Post()
  async create(@Body() dto: CreateFeatureDto): Promise<FeatureEntity> {
    return this.featureService.create(dto);
  }

  @ApiOperation({ summary: 'Update' })
  @ApiOkResponse({ type: FeatureEntity })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureDto,
  ): Promise<FeatureEntity> {
    return this.featureService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.featureService.remove(id);
  }
}
```

---

## Service

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureEntity } from './feature.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(FeatureEntity)
    private readonly repository: Repository<FeatureEntity>,
  ) {}

  async findAll(): Promise<FeatureEntity[]> {
    return this.repository.find({ where: { deletedAt: null } });
  }

  async findOne(id: string): Promise<FeatureEntity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Feature not found');
    return entity;
  }

  async create(dto: CreateFeatureDto): Promise<FeatureEntity> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async update(id: string, dto: UpdateFeatureDto): Promise<FeatureEntity> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softDelete(entity.id);
  }
}
```

**Error handling:**
```typescript
throw new NotFoundException('Resource not found');
throw new ForbiddenException('Access denied');
throw new BadRequestException('Validation error');
throw new ConflictException('Resource already exists');
```

---

## Module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { FeatureEntity } from './feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

---

## Paginated Response

```typescript
interface PaginationResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}
```

---

## Authentication

- JWT with Passport (`@nestjs/passport`)
- `PoliciesGuard` for route protection (CASL)
- MFA support (TOTP)
- OAuth via Google

---

## Environment Variables

```env
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=
MAIL_HOST=
MAIL_USER=
MAIL_PASS=
STORAGE_PROVIDER=   # gcs or s3
```

---

## Useful Commands

```bash
pnpm start:dev       # Dev server
pnpm build           # Build
pnpm test            # Tests (Jest)
pnpm seed            # Run seeders
pnpm make:entity     # Scaffold new entity
```
