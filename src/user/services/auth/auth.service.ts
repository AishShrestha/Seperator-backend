import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserService } from '../user/user.service';
import { LoginDto } from '../../dto/login.dto';
import { UserEntity } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async register(userDto: CreateUserDto): Promise<UserEntity> {
    // Check if user already exists
    const userExists = await this.userService.isUserExists(userDto.email);
    if (userExists) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    // Create new user
    return await this.userService.createUser(userDto);
  }

  async login(loginRequest: LoginDto): Promise<string | void> {
    const { email, password } = loginRequest;
    const user = await this.userService.isUserExists(email);

    // If user doesn't exist, fail login
    if (!user) {
      return this.failLogin('User does not exist');
    }

    // Check password match
    if (await this.userService.checkUserPassword(user, password)) {
      const token = this.userService.getUserToken(user);
      user.token = token;
      await this.userService.updateUser(user);

      return token;
    }

    // Password doesn't match
    return this.failLogin('Incorrect password');
  }

  private failLogin(message = 'Login failed') {
    console.log('Attempting to throw error...');
    // Return a generic or custom login failure message
    throw new NotFoundException(message);
  }
}
