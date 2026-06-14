import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { plainToClass } from 'class-transformer';
import { IsEnum, IsString, IsUUID, validateOrReject } from 'class-validator';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { Role } from '../common/entity/rolebase';
import { EnvService } from '../env/env.service';

export interface IPayload {
  sub: string;
  // role: Roles
}

export class IJwtPayload {
  @IsString()
  @IsUUID()
  userId: string;

  @IsEnum(Role)
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase) {
  constructor(env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.get('JWT_SECRET'),
    });
  }

  async validate(payload: IPayload) {
    const jwtPayload = plainToClass(IJwtPayload, payload);
    await validateOrReject(jwtPayload);
    return jwtPayload;
  }
}
