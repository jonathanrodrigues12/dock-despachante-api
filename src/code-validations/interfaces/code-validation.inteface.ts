import { CodeValidation } from '../code-validation.entity';

export interface ICodeValidationRepository {
  save(codeValidation: Partial<CodeValidation>): Promise<CodeValidation>;
  findByCode(code: string): Promise<CodeValidation | null>;
  deleted(userId: string): Promise<void>;
  update(id: string, codeValidation: Partial<CodeValidation>): Promise<CodeValidation>;
}
