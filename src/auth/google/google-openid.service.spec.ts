import { Test, TestingModule } from '@nestjs/testing';
import { GoogleOpenIdService } from './google-openid.service';
import { AuthProvider } from '../../common/enums/provider.enum';

const mockClient = {
  authorizationUrl: jest.fn(() => 'https://accounts.google.com/o/oauth2/auth?state=s&nonce=n'),
  callbackParams: jest.fn(() => ({ code: 'auth-code', state: 'test-state' })),
  callback: jest.fn(),
};

const mockIssuer = {
  Client: jest.fn(() => mockClient),
};

jest.mock('openid-client', () => ({
  Issuer: {
    discover: jest.fn(() => Promise.resolve(mockIssuer)),
  },
  generators: {
    nonce: jest.fn(() => 'test-nonce'),
    state: jest.fn(() => 'test-state'),
  },
}));

describe('GoogleOpenIdService', () => {
  let service: GoogleOpenIdService;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3333/auth/google/callback';

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleOpenIdService],
    }).compile();

    service = module.get<GoogleOpenIdService>(GoogleOpenIdService);
    await service.onModuleInit();
  });

  describe('getAuthorizationUrl', () => {
    it('should return authorization URL', () => {
      const url = service.getAuthorizationUrl('test-state', 'test-nonce');

      expect(url).toContain('accounts.google.com');
      expect(mockClient.authorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid email profile',
          state: 'test-state',
          nonce: 'test-nonce',
        }),
      );
    });
  });

  describe('handleCallback', () => {
    const mockReq = { cookies: {} } as any;

    it('should return OAuthGoogleUserDto on success', async () => {
      mockClient.callback.mockResolvedValueOnce({
        claims: () => ({
          email: 'user@google.com',
          name: 'John Doe',
          picture: 'https://photo.url',
        }),
        access_token: 'google-access-token',
      });

      const result = await service.handleCallback(mockReq, 'auth-code', 'test-nonce', 'test-state');

      expect(result).toEqual({
        email: 'user@google.com',
        name: 'John',
        surname: 'Doe',
        picture: 'https://photo.url',
        provider: AuthProvider.GOOGLE,
        accessToken: 'google-access-token',
      });
    });

    it('should handle single-word name (no surname)', async () => {
      mockClient.callback.mockResolvedValueOnce({
        claims: () => ({
          email: 'user@google.com',
          name: 'John',
          picture: undefined,
        }),
        access_token: 'access-token',
      });

      const result = await service.handleCallback(mockReq, 'auth-code', 'test-nonce', 'test-state');

      expect(result.name).toBe('John');
      expect(result.surname).toBe('');
    });

    it('should throw if email is missing', async () => {
      mockClient.callback.mockResolvedValueOnce({
        claims: () => ({ name: 'John Doe', picture: undefined, email: undefined }),
        access_token: 'token',
      });

      await expect(
        service.handleCallback(mockReq, 'code', 'nonce', 'state'),
      ).rejects.toThrow('Missing required user info from Google.');
    });

    it('should throw if access_token is missing', async () => {
      mockClient.callback.mockResolvedValueOnce({
        claims: () => ({ email: 'user@google.com', name: 'John', picture: undefined }),
        access_token: undefined,
      });

      await expect(
        service.handleCallback(mockReq, 'code', 'nonce', 'state'),
      ).rejects.toThrow('Missing required user info from Google.');
    });
  });
});
