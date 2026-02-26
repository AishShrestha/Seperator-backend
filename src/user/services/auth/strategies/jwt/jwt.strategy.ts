import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/** Extracts JWT from HttpOnly cookie only: access_token (HTTPS-only in production). */
function jwtFromRequest(req: Request): string | null {
  return (req as Request & { cookies?: { access_token?: string } }).cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtSecret') ?? 'jwtSecret',
    });
  }

  async validate(payload: Record<string, any>): Promise<Record<string, any>> {
    // Return the payload (you can add additional validation here if needed)
    return payload;
  }
}
