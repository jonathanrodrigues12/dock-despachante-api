import { generateValidationCode } from './util';

describe('generateValidationCode', () => {
  it('retorna uma string', () => {
    expect(typeof generateValidationCode()).toBe('string');
  });

  it('sempre tem exatamente 6 dígitos', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateValidationCode();
      expect(code).toHaveLength(6);
    }
  });

  it('contém apenas dígitos numéricos', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateValidationCode()).toMatch(/^\d{6}$/);
    }
  });

  it('valor mínimo é 100000', () => {
    for (let i = 0; i < 200; i++) {
      expect(Number(generateValidationCode())).toBeGreaterThanOrEqual(100000);
    }
  });

  it('valor máximo é 999999', () => {
    for (let i = 0; i < 200; i++) {
      expect(Number(generateValidationCode())).toBeLessThanOrEqual(999999);
    }
  });

  it('gera valores distintos (distribuição aleatória)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateValidationCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
