import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class Meta {
  @ApiProperty({ example: 10 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 10 })
  perPage: number;
}

export class PaginationResponse<T> {
  @ApiProperty({
    isArray: true,
    type: 'boolean',
    items: { type: 'object' },
  })
  data: T[];
  @ApiProperty({ type: Meta })
  meta: Meta;
}

export const PaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginationResponse, model),
    ApiOkResponse({
      description: 'Paginated list of records',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginationResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
