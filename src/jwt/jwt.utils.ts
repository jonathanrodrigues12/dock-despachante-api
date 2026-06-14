import { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export function getUserIdFromRequest(req: Request): string | undefined {
  try {
    console.log(req);
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.substring(7, authHeader.length);

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & {
      userId?: string;
    };

    return decoded.userId;
  } catch (err) {
    return undefined; // em caso de erro no token
  }
}
