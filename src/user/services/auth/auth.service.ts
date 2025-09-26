import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserService } from '../user/user.service';
import { LoginDto } from '../../dto/login.dto';
import { UserEntity } from '../../entity/user.entity';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(userDto: CreateUserDto): Promise<{
    user: Partial<UserEntity>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if user already exists
    const userExists = await this.userService.isUserExists(userDto.email);
    if (userExists) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    // Create new user
    const result = await this.userService.createUser(userDto);
    
    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  async login(loginRequest: LoginDto): Promise<{
    user: Partial<UserEntity>;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password } = loginRequest;
    const user = await this.userService.isUserExists(email);

    // If user doesn't exist, fail login
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    // Check password match
    const isPasswordValid = await this.userService.checkUserPassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.userService.generateTokensForUser(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      const userId = payload.id;

      // Validate refresh token in database
      const isValid = await this.userService.validateRefreshToken(userId, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userService.findByIdWithRefreshToken(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.userService.generateTokensForUser(user);
      
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userService.removeRefreshToken(userId);
  }
}
