import { DataSource } from 'typeorm';
import { hash } from 'bcryptjs';
import { User } from '../../user/entity/user.entity';
import { UserRole } from '../../user/enums/user-role.enum';

/**
 * Seeds admin user from env vars.
 * Set ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD in .env to create admin.
 * If user with that email already exists, throws error (does not update role).
 */
export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !name || !password) {
    console.log(
      'Skipping admin seed: set ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD in .env',
    );
    return;
  }

  const userRepository = dataSource.getRepository(User);
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await hash(password, 10);

  const existing = await userRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new Error(
      `User with email address ${normalizedEmail} already exists. Cannot create admin.`,
    );
  } else {
    await userRepository.insert({
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    console.log(`Admin created: ${normalizedEmail}`);
  }
}
