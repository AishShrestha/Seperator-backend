import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    // Load the JWT secret directly in the constructor
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtSecret') ?? 'jwtSecret', // Use direct typing for clarity
    });
  }

  async validate(payload: Record<string, any>): Promise<Record<string, any>> {
    // Return the payload (you can add additional validation here if needed)
    return payload;
  }
}
