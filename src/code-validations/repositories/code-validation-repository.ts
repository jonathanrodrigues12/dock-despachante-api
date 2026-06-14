import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CodeValidation } from '../code-validation.entity';
import { ICodeValidationRepository } from '../interfaces/code-validation.inteface';
import { Repository } from 'typeorm';

@Injectable()
export class CodeValidationRepository implements ICodeValidationRepository {
  constructor(
    @InjectRepository(CodeValidation)
    private readonly repository: Repository<CodeValidation>,
  ) {}

  async save(codeValidation: Partial<CodeValidation>): Promise<CodeValidation> {
    const code = this.repository.create(codeValidation);
    return this.repository.save(code);
  }
  async findByCode(code: string): Promise<CodeValidation | null> {
    const codeValidation = await this.repository.findOne({
      where: { code },
      relations: ['user'],
    });
    return codeValidation || null;
  }
  async deleted(userId: string): Promise<void> {
    const code = await this.repository.find({ where: { user: { id: userId } } });
    if (!code) return;
    await this.repository.remove(code);
  }

  async update(id: string, codeValidation: Partial<CodeValidation>): Promise<CodeValidation> {
    await this.repository.update(id, codeValidation);
    const updatedCode = await this.repository.findOne({ where: { id } });
    if (!updatedCode) {
      throw new NotFoundException('Validation Code not found');
    }
    Object.assign(updatedCode, codeValidation);
    return await this.repository.save(updatedCode);
  }
}
