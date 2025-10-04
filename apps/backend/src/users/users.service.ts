import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../core/database/entities/user.entity';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { UserResponseDto, PaginatedUsersResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(page = 1, limit = 10): Promise<PaginatedUsersResponseDto> {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      users: users.map(user => this.toResponseDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['accounts'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestingUserId: string, requestingUserRole: UserRole): Promise<UserResponseDto> {
    // Authorization: users can update their own data, admins can update anyone
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user fields
    Object.assign(user, updateUserDto);

    const updatedUser = await this.userRepository.save(user);
    return this.toResponseDto(updatedUser);
  }

  async updateStatus(id: string, updateStatusDto: UpdateUserStatusDto, requestingUserRole: UserRole): Promise<UserResponseDto> {
    // Only admins can change user status
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can change user status');
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.status = updateStatusDto.status;
    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  async remove(id: string, requestingUserRole: UserRole): Promise<void> {
    // Only admins can delete users
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.remove(user);
  }

  async getStats(): Promise<{ total: number; active: number; inactive: number; suspended: number }> {
    const [total, active, inactive, suspended] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.INACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
    ]);

    return { total, active, inactive, suspended };
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      timezone: user.timezone,
      currency: user.currency,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
