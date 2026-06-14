---
name: nestjs-standards
description: >
  Enforce NestJS backend development standards when writing, reviewing, or generating code.
  Use this skill whenever the user asks to create a new module, entity, DTO, service, controller,
  or any piece of backend code in a NestJS project with TypeORM and PostgreSQL.
  Also trigger when scaffolding a feature, refactoring existing backend code, or setting up
  authentication, authorization, validation, or Swagger documentation.
  Apply this skill even when the user doesn't say "follow standards" — consistency across the
  backend codebase is the goal.
---

# NestJS Backend Standards

## Stack

| Area | Standard |
|---|---|
| Framework | NestJS 11+ / TypeScript 5+ |
| ORM | TypeORM + PostgreSQL |
| Auth | JWT + Passport + CASL |
| Validation | class-validator + class-transformer |
| Docs | @nestjs/swagger |
| Tests | Jest |

Read the full patterns in `references/nestjs.md` before producing any code.

## How to apply this skill

1. Read the relevant section in `references/nestjs.md` for the artifact requested (entity, DTO, controller, service, module).
2. When creating a new feature module, always scaffold all five files: entity, service, controller, module, and DTOs.
3. Generate code that follows naming conventions and folder structure exactly.
4. Do not add comments explaining what the code does — only comment when the WHY is non-obvious.

## Critical rules

- Entities **must** extend `EntityBase` from `@/common/entity/entity-base`
- DB column names: `snake_case` via `{ name: 'snake_case' }`; TypeScript properties: `camelCase`
- Never hard delete — always soft delete via `deleted_at` from `EntityBase`
- Never use `any` — type everything
- All DTO fields must have `@ApiProperty` for Swagger docs
- All DTO fields must have class-validator decorators with Portuguese error messages
- Controllers must use `@UseGuards(PoliciesGuard)`, `@ApiBearerAuth()`, `@ApiTags()`
- Services throw NestJS exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`

## File naming

| Pattern | Convention |
|---|---|
| Files & folders | `kebab-case` |
| Classes & interfaces | `PascalCase` |
| Variables & functions | `camelCase` |
| Constants | `SCREAMING_SNAKE_CASE` |
| Enum names & values | `PascalCase` |
| DB table names | `snake_case` |

## Folder structure

```
src/[feature]/
├── dto/
│   ├── create-[feature].dto.ts
│   └── update-[feature].dto.ts
├── interfaces/
├── repositories/
├── [feature].controller.ts
├── [feature].service.ts
├── [feature].module.ts
└── [feature].entity.ts
```
