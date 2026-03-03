import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';
import { AuthService } from './services/auth/auth.service';
import { UserService } from './services/user/user.service';
import { PasswordService } from './services/password/password.service';
import { JwtService } from './services/jwt/jwt.service';
import { MailService } from '../global/services/mail/mail.service';
import { RegistrationService } from './services/registration/registration.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserRole } from './enums/user-role.enum';

const mockUser = {
  id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRole.USER,
};

describe('UserController', () => {
  let controller: UserController;
  let authService: AuthService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        AuthService,
        UserService,
        PasswordService,
        JwtService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        { provide: MailService, useValue: { send: jest.fn() } },
        {
          provide: RegistrationService,
          useValue: { registerWithSubscription: jest.fn() },
        },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: 'CACHE_MANAGER', useValue: jest.fn() },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register method', () => {
    it('should register user and return user with message', async () => {
      const registerResult: { user: Partial<User>; accessToken: string; refreshToken: string } = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      jest.spyOn(authService, 'register').mockResolvedValue(registerResult);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await controller.register(
        {
          name: 'Test User',
          email: 'test@example.com',
          password: 'p',
          planId: 'plan-uuid',
        },
        res,
      );

      expect(result).toStrictEqual({
        message: 'User registered successfully',
        user: mockUser,
      });
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', expect.any(Object));
    });
  });

  describe('login method', () => {
    it('should login user and return user with message', async () => {
      const loginResult: { user: Partial<User>; accessToken: string; refreshToken: string } = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      jest.spyOn(authService, 'login').mockResolvedValue(loginResult);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await controller.login(
        { email: 'test@example.com', password: 'p' },
        res,
      );

      expect(result).toStrictEqual({
        message: 'Login successful',
        user: mockUser,
      });
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', expect.any(Object));
    });
  });

  describe('getUsers method', () => {
    it('should retrieve all users', async () => {
      jest.spyOn(userService, 'getAll').mockResolvedValue([mockUser] as User[]);

      expect(await controller.getUsers()).toStrictEqual({
        message: 'Users retrieved successfully',
        users: [mockUser],
      });
    });
  });
});
