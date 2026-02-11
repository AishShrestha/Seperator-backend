import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
  Req,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from './services/auth/auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserService } from './services/user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Response, Request } from 'express';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async register(@Body() user: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(user);

    // Set both access and refresh tokens as HttpOnly cookies
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('login')
  async login(@Body() login: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(login);
    console.log('Login result:', result);

    // Set both access and refresh tokens as HttpOnly cookies
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Set new tokens as cookies
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Tokens refreshed successfully',
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user?.id;

    if (userId) {
      await this.authService.logout(userId);
    }

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      message: 'Logged out successfully',
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Get()
  async getUsers() {
    const users = await this.userService.getAll();

    return {
      message: 'Users retrieved successfully',
      users,
    };
  }

  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}
