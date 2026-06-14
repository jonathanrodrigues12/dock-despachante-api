declare module 'express-basic-auth' {
  import { RequestHandler } from 'express';

  interface BasicAuthOptions {
    users?: Record<string, string>;
    challenge?: boolean;
    realm?: string | ((req: import('express').Request) => string);
    authorizer?: (
      username: string,
      password: string,
      callback?: (err: Error | null, authenticated: boolean) => void,
    ) => boolean | void;
    authorizeAsync?: boolean;
    unauthorizedResponse?: object | string | ((req: import('express').Request) => object | string);
  }

  function basicAuth(options: BasicAuthOptions): RequestHandler;
  export = basicAuth;
}
