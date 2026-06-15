import jwt from 'jsonwebtoken';
import { getUserIdFromRequest } from './jwt.utils';

const SECRET = 'test-secret';

function makeRequest(authHeader?: string): any {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe('getUserIdFromRequest', () => {
  it('extrai userId de um token válido', () => {
    const token = jwt.sign({ userId: 'user-123' }, SECRET);
    const req = makeRequest(`Bearer ${token}`);
    expect(getUserIdFromRequest(req)).toBe('user-123');
  });

  it('retorna undefined quando não há header Authorization', () => {
    expect(getUserIdFromRequest(makeRequest())).toBeUndefined();
  });

  it('retorna undefined quando header não começa com "Bearer "', () => {
    const token = jwt.sign({ userId: 'user-123' }, SECRET);
    expect(getUserIdFromRequest(makeRequest(`Token ${token}`))).toBeUndefined();
  });

  it('retorna undefined quando o token é inválido (assinatura errada)', () => {
    const token = jwt.sign({ userId: 'user-123' }, 'wrong-secret');
    expect(getUserIdFromRequest(makeRequest(`Bearer ${token}`))).toBeUndefined();
  });

  it('retorna undefined quando o token está expirado', () => {
    const token = jwt.sign({ userId: 'user-123' }, SECRET, { expiresIn: -1 });
    expect(getUserIdFromRequest(makeRequest(`Bearer ${token}`))).toBeUndefined();
  });

  it('retorna undefined quando userId não está no payload', () => {
    const token = jwt.sign({ sub: 'user-123' }, SECRET);
    const result = getUserIdFromRequest(makeRequest(`Bearer ${token}`));
    expect(result).toBeUndefined();
  });
});
