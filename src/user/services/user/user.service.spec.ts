import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entity/user.entity';
import { UserRole } from '../../enums/user-role.enum';
import { PasswordService } from '../password/password.service';
import { JwtService } from '../jwt/jwt.service';
import { Repository } from 'typeorm';
const mockUser: Partial<User> = {
  id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRole.USER,
  password: 'hashed-password',
};

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<User>;
  let passwordService: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        PasswordService,
        JwtService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    passwordService = module.get<PasswordService>(PasswordService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to check user existence', async () => {
    const findOneSpy = jest.spyOn(repo, 'findOne').mockResolvedValue(null);

    expect(await service.isUserExists('mail')).toBe(null);
    expect(findOneSpy).toHaveBeenCalled();
  });

  it('should be able to create user', async () => {
    const passwordSpy = jest
      .spyOn(passwordService, 'generate')
      .mockResolvedValue('password-hash');
    const createSpy = jest
      .spyOn(repo, 'create')
      .mockReturnValue(mockUser as User);
    const saveSpy = jest.spyOn(repo, 'save').mockResolvedValue(mockUser as User);

    const result = await service.createUser({
      email: 'test@example.com',
      name: 'Test User',
      password: 'password',
      planId: 'plan-uuid',
    });

    expect(result.user).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(passwordSpy).toHaveBeenCalledWith('password');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      }),
    );
    expect(saveSpy).toHaveBeenCalled();
  });

  it('should check user password', async () => {
    const compareSpy = jest
      .spyOn(passwordService, 'compare')
      .mockResolvedValue(true);

    expect(
      await service.checkUserPassword(mockUser as User, 'request-password'),
    ).toBe(true);
    expect(compareSpy).toHaveBeenCalledWith('request-password', 'hashed-password');
  });

  it('should get all users', async () => {
    const repoSpy = jest
      .spyOn(repo, 'find')
      .mockResolvedValue([mockUser] as User[]);

    expect(await service.getAll()).toStrictEqual([mockUser]);
    expect(repoSpy).toHaveBeenCalledWith({
      select: ['id', 'email', 'name', 'role'],
    });
  });
});
