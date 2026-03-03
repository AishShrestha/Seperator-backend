import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PasswordService } from '../password/password.service';
import { JwtService } from '../jwt/jwt.service';
import { MailService } from '../../../global/services/mail/mail.service';
import { RegistrationService } from '../registration/registration.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserRole } from '../../enums/user-role.enum';

const mockUser: Partial<User> = {
  id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRole.USER,
};

describe('AuthService', () => {
  let authService: AuthService;
  let registrationService: RegistrationService;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        PasswordService,
        JwtService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        {
          provide: MailService,
          useValue: { send: jest.fn() },
        },
        {
          provide: RegistrationService,
          useValue: { registerWithSubscription: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    registrationService = module.get<RegistrationService>(RegistrationService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to RegistrationService', async () => {
      const dto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        planId: 'plan-uuid',
      };
      const expected = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      jest
        .spyOn(registrationService, 'registerWithSubscription')
        .mockResolvedValue(expected);

      const result = await authService.register(dto);

      expect(registrationService.registerWithSubscription).toHaveBeenCalledWith(dto);
      expect(result).toStrictEqual(expected);
    });
  });

  describe('login', () => {
    it('should throw when user does not exist', async () => {
      jest.spyOn(userService, 'isUserExists').mockResolvedValue(null);

      await expect(
        authService.login({ email: 'email', password: 'password' }),
      ).rejects.toThrow('User does not exist');
    });

    it('should throw when password is invalid', async () => {
      jest.spyOn(userService, 'isUserExists').mockResolvedValue(mockUser as User);
      jest.spyOn(userService, 'checkUserPassword').mockResolvedValue(false);

      await expect(
        authService.login({ email: 'email', password: 'password' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should return user and tokens when credentials are valid', async () => {
      jest.spyOn(userService, 'isUserExists').mockResolvedValue(mockUser as User);
      jest.spyOn(userService, 'checkUserPassword').mockResolvedValue(true);
      jest.spyOn(userService, 'generateTokensForUser').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login({
        email: 'email',
        password: 'password',
      });

      expect(result).toMatchObject({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });
});
