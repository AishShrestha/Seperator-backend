import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../../dto/create-user.dto';
import { PasswordService } from '../password/password.service';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async isUserExists(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        email: email.toLowerCase(),
      },
      select: ['id', 'name', 'email', 'password'],
    });
  }

  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'refreshToken', 'refreshTokenExpiresAt'],
    });
  }

  async createUser(
    userDto: CreateUserDto,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const userPayload = {
      email: userDto.email.toLowerCase(),
      name: userDto.name,
      password: await this.passwordService.generate(userDto.password),
    };

    const newUser = this.usersRepository.create(userPayload);
    const savedUser = await this.usersRepository.save(newUser);

    const tokens = await this.generateTokensForUser(savedUser);

    return {
      user: savedUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async generateTokensForUser(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
    };
    console.log('payload', payload);

    const accessToken = this.jwtService.signAccessToken(payload);
    const refreshToken = this.jwtService.signRefreshToken({ id: user.id });

    // Store refresh token in database
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.usersRepository.update(userId, {
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: undefined,
      refreshTokenExpiresAt: undefined,
    });
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshToken || !user.refreshTokenExpiresAt) {
      return false;
    }

    // Check if token matches and hasn't expired
    return user.refreshToken === refreshToken && new Date() < user.refreshTokenExpiresAt;
  }

  async updateUser(newUser: User): Promise<User> {
    return await this.usersRepository.save(newUser);
  }

  async checkUserPassword(user: User, requestPassword: string): Promise<boolean> {
    return this.passwordService.compare(requestPassword, user.password);
  }

  public getUserToken(user: User): string {
    return this.jwtService.signAccessToken({
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
    });
  }

  public getAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'name'],
    });
  }
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setPasswordResetToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordResetToken: hashedToken,
      passwordResetTokenExpiresAt: expiresAt,
    });
  }

  async findByPasswordResetToken(hashedToken: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.passwordResetToken = :hashedToken', { hashedToken })
      .andWhere('user.passwordResetTokenExpiresAt > :now', {
        now: new Date(),
      })
      .getOne();
  }

  async updatePasswordAndClearResetToken(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    });
  }
}
