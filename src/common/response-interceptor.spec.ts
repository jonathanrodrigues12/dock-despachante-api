import { of } from 'rxjs';
import { ResponseInterceptor } from './response-interceptor';

function makeContext(method: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function makeHandler(value: any) {
  return { handle: () => of(value) };
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('envolve resposta em { success: true, data, errors: null }', (done) => {
    interceptor
      .intercept(makeContext('GET'), makeHandler({ id: 1 }))
      .subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ id: 1 });
        expect(result.errors).toBeNull();
        done();
      });
  });

  it('mensagem GET = "Operação realizada com sucesso"', (done) => {
    interceptor
      .intercept(makeContext('GET'), makeHandler(null))
      .subscribe((result) => {
        expect(result.message).toBe('Operação realizada com sucesso');
        done();
      });
  });

  it('mensagem POST = "Recurso criado com sucesso"', (done) => {
    interceptor
      .intercept(makeContext('POST'), makeHandler({ id: 2 }))
      .subscribe((result) => {
        expect(result.message).toBe('Recurso criado com sucesso');
        done();
      });
  });

  it('converte data null para null (não para undefined)', (done) => {
    interceptor
      .intercept(makeContext('GET'), makeHandler(null))
      .subscribe((result) => {
        expect(result.data).toBeNull();
        done();
      });
  });

  it('converte data undefined para null', (done) => {
    interceptor
      .intercept(makeContext('DELETE'), makeHandler(undefined))
      .subscribe((result) => {
        expect(result.data).toBeNull();
        done();
      });
  });

  it('inclui timestamp no formato ISO 8601', (done) => {
    interceptor
      .intercept(makeContext('GET'), makeHandler({}))
      .subscribe((result) => {
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        done();
      });
  });

  it('PATCH usa mensagem de operação realizada (não de criação)', (done) => {
    interceptor
      .intercept(makeContext('PATCH'), makeHandler({}))
      .subscribe((result) => {
        expect(result.message).toBe('Operação realizada com sucesso');
        done();
      });
  });
});
