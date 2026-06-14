import { Injectable, OnModuleInit } from '@nestjs/common';
import { Issuer, generators, Client } from 'openid-client';
import { AuthProvider } from '../../common/enums/provider.enum';
import { OAuthGoogleUserDto } from './dto/google-oAuth-User.dto';
import { Request } from 'express';
@Injectable()
export class GoogleOpenIdService implements OnModuleInit {
  private client: Client;

  async onModuleInit() {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');

    this.client = new googleIssuer.Client({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uris: [process.env.GOOGLE_CALLBACK_URL as string],
      response_types: ['code'],
    });
  }

  getAuthorizationUrl(state: string, nonce: string): string {
    return this.client.authorizationUrl({
      scope: 'openid email profile',
      response_type: 'code',
      state, // <-- ESSENCIAL
      nonce, // <-- ESSENCIAL
      prompt: 'select_account',
    });
  }

  async handleCallback(
    req: Request,
    code: string,
    nonce: string,
    state: string,
  ): Promise<OAuthGoogleUserDto> {
    const params = this.client.callbackParams(req);
    const tokenSet = await this.client.callback(process.env.GOOGLE_CALLBACK_URL!, params, {
      nonce,
      state,
    });

    const claims = tokenSet.claims();

    const fullName = claims.name ?? '';
    const [firstName, ...rest] = fullName.trim().split(' ');
    const surname = rest.join(' ');

    if (!claims.email || !tokenSet.access_token) {
      throw new Error('Missing required user info from Google.');
    }

    return {
      email: claims.email,
      name: firstName,
      surname,
      picture: claims.picture,
      provider: AuthProvider.GOOGLE,
      accessToken: tokenSet.access_token,
    };
  }
}
