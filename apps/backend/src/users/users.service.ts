import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { UserResponseDto, PaginatedUsersResponseDto } from './dto/user-response.dto';
import { PrismaUserService } from '../core/database/prisma/services/user.service';
import { enrichUserWithVirtuals } from '../core/database/prisma/utils/user-virtuals';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaUserService: PrismaUserService,
  ) {}

  async findAll(page = 1, limit = 10): Promise<PaginatedUsersResponseDto> {
    const skip = (page - 1) * limit;

    const { users, total } = await this.prismaUserService.findAllWithCount({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      users: users.map(user => this.toResponseDto(enrichUserWithVirtuals(user))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prismaUserService.findOneWithRelations(id, {
      accounts: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(enrichUserWithVirtuals(user));
  }

  async findByEmail(email: string) {
    return this.prismaUserService.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestingUserId: string, requestingUserRole: UserRole): Promise<UserResponseDto> {
    // Authorization: users can update their own data, admins can update anyone
    if (id !== requestingUserId && requestingUserRole as any !== 'ADMIN') {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prismaUserService.findOne(id);

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
    const updatedUser = await this.prismaUserService.update(id, updateUserDto);
    return this.toResponseDto(enrichUserWithVirtuals(updatedUser));
  }

  async updateStatus(id: string, updateStatusDto: UpdateUserStatusDto, requestingUserRole: UserRole): Promise<UserResponseDto> {
    // Only admins can change user status
    if (requestingUserRole as any !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can change user status');
    }

    const user = await this.prismaUserService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prismaUserService.update(id, {
      status: updateStatusDto.status as any, // Type cast to handle enum mismatch
    });

    return this.toResponseDto(enrichUserWithVirtuals(updatedUser));
  }

  async remove(id: string, requestingUserRole: UserRole): Promise<void> {
    // Only admins can delete users
    if (requestingUserRole as any !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can delete users');
    }

    const user = await this.prismaUserService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prismaUserService.delete(id);
  }

  async getStats(): Promise<{ total: number; active: number; inactive: number; suspended: number }> {
    return this.prismaUserService.countByStatus();
  }

  private toResponseDto(user: ReturnType<typeof enrichUserWithVirtuals>): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role as any, // Type cast to handle enum mismatch
      status: user.status as any, // Type cast to handle enum mismatch
      avatar: user.avatar,
      timezone: user.timezone,
      currency: user.currency,
      preferences: user.preferences as Record<string, any> | null,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
