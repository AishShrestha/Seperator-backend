import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserService } from '../user/user.service';
import { LoginDto } from '../../dto/login.dto';
import { User } from '../../entity/user.entity';
import { JwtService } from '../jwt/jwt.service';
import { PasswordService } from '../password/password.service';
import { MailService } from '../../../global/services/mail/mail.service';
import { RegistrationService } from '../registration/registration.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly mailService: MailService,
    private readonly registrationService: RegistrationService,
  ) {}

  /**
   * Registers user with subscription. Delegates to RegistrationService for
   * atomic Stripe + DB flow (customer, subscription, user, subscription record).
   */
  async register(userDto: CreateUserDto): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    return this.registrationService.registerWithSubscription(userDto);
  }

  async login(loginRequest: LoginDto): Promise<{ 
    user: Partial<User>;
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
        role: user.role,
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

  /**
   * Generates a password reset token, stores it, and sends reset link to the user's email.
   * Returns the same message whether the email exists or not to prevent user enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userService.isUserExists(email);

    if (user) {
      const plainToken = randomBytes(32).toString('hex');
      const hashedToken = this.passwordService.hashResetToken(plainToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await this.userService.setPasswordResetToken(user.id, hashedToken, expiresAt);

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${plainToken}`;

      await this.mailService.send({
        to: user.email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click the link to reset your password: ${resetUrl}. This link expires in 1 hour.`,
        html: `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>`,
      });
    }

    return {
      message:
        'If an account exists with this email, you will receive a password reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hashedToken = this.passwordService.hashResetToken(token);
    const user = await this.userService.findByPasswordResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await this.passwordService.generate(newPassword);
    await this.userService.updatePasswordAndClearResetToken(user.id, hashedPassword);

    return { message: 'Password has been reset successfully' };
  }
}
