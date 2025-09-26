import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'users',
})
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({
    name: 'password',
    select: false,
  })
  password: string;

  @Column({
    name: 'refresh_token',
    nullable: true,
    select: false,
  })
  refreshToken: string;

  @Column({
    name: 'refresh_token_expires_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  refreshTokenExpiresAt: Date;
}
