import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { UserRole, UserStatus } from '../../../generated/prisma';
import { UpdateUserDto, UpdateUserStatusDto } from '../../../src/users/dto/update-user.dto';
import { PrismaUserService } from '../../../src/core/database/prisma/services/user.service';
import type { User } from '../../../generated/prisma';
import { mock, mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('UsersService', () => {
  let service: UsersService;
  let prismaUserService: DeepMockProxy<PrismaUserService>;

  // Helper to create mock Prisma user
  const createMockUser = (partial: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    role: 'MEMBER' as any,
    status: 'ACTIVE' as any,
    avatar: null,
    timezone: 'UTC',
    currency: 'USD',
    preferences: null,
    lastLoginAt: null,
    emailVerifiedAt: new Date('2024-01-01'),
    familyId: 'family-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...partial,
  });

  beforeEach(async () => {
    prismaUserService = mockDeep<PrismaUserService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaUserService,
          useValue: prismaUserService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users with default pagination', async () => {
      const users = [
        createMockUser(),
        createMockUser({ id: 'user-456', email: 'test2@example.com' }),
      ];
      prismaUserService.findAllWithCount.mockResolvedValueOnce({ users, total: 25 });

      const result = await service.findAll();

      expect(prismaUserService.findAllWithCount).toHaveBeenCalledWith({
        skip: 0, // (1 - 1) * 10
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({ id: 'user-123' }),
          expect.objectContaining({ id: 'user-456' }),
        ]),
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3, // Math.ceil(25 / 10)
      });
    });

    it('should handle custom pagination', async () => {
      const users = [createMockUser()];
      prismaUserService.findAllWithCount.mockResolvedValueOnce({ users, total: 40 });

      const result = await service.findAll(2, 20);

      expect(prismaUserService.findAllWithCount).toHaveBeenCalledWith({
        skip: 20, // (2 - 1) * 20
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(2); // Math.ceil(40 / 20)
    });

    it('should calculate skip correctly for page 3', async () => {
      prismaUserService.findAllWithCount.mockResolvedValueOnce({ users: [], total: 100 });

      await service.findAll(3, 15);

      expect(prismaUserService.findAllWithCount).toHaveBeenCalledWith({
        skip: 30, // (3 - 1) * 15
        take: 15,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty results', async () => {
      prismaUserService.findAllWithCount.mockResolvedValueOnce({ users: [], total: 0 });

      const result = await service.findAll();

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should map users to response DTOs with virtual properties', async () => {
      const user = createMockUser({
        firstName: 'Jane',
        lastName: 'Smith',
        emailVerifiedAt: new Date(),
        status: 'ACTIVE' as any,
      });
      prismaUserService.findAllWithCount.mockResolvedValueOnce({ users: [user], total: 1 });

      const result = await service.findAll();

      expect(result.users[0]).toMatchObject({
        fullName: 'Jane Smith',
        isEmailVerified: true,
        isActive: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return user with accounts relation loaded', async () => {
      const user = createMockUser();
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(prismaUserService.findOneWithRelations).toHaveBeenCalledWith('user-123', {
        accounts: true,
      });

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'User with ID non-existent not found',
      );
    });

    it('should return UserResponseDto with all virtual properties', async () => {
      const user = createMockUser({
        emailVerifiedAt: new Date(),
        status: 'ACTIVE' as any,
      });
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result).toHaveProperty('fullName', 'John Doe');
      expect(result).toHaveProperty('isEmailVerified', true);
      expect(result).toHaveProperty('isActive', true);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const user = createMockUser();
      prismaUserService.findByEmail.mockResolvedValueOnce(user);

      const result = await service.findByEmail('test@example.com');

      expect(prismaUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      prismaUserService.findByEmail.mockResolvedValueOnce(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    describe('Authorization', () => {
      it('should allow user to update their own profile', async () => {
        const user = createMockUser();
        prismaUserService.findOne.mockResolvedValueOnce(user);
        prismaUserService.update.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        const result = await service.update(
          'user-123',
          updateDto,
          'user-123',
          'MEMBER' as any,
        );

        expect(result).toBeDefined();
        expect(prismaUserService.update).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when user tries to update another user', async () => {
        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        await expect(
          service.update('user-456', updateDto, 'user-123', 'MEMBER' as any),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          service.update('user-456', updateDto, 'user-123', 'MEMBER' as any),
        ).rejects.toThrow('You can only update your own profile');
      });

      it('should allow admin to update any user profile', async () => {
        const user = createMockUser({ id: 'user-456' });
        prismaUserService.findOne.mockResolvedValueOnce(user);
        prismaUserService.update.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        const result = await service.update(
          'user-456',
          updateDto,
          'admin-123',
          'ADMIN' as any,
        );

        expect(result).toBeDefined();
        expect(prismaUserService.update).toHaveBeenCalled();
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaUserService.findOne.mockResolvedValueOnce(null);

      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      await expect(
        service.update('non-existent', updateDto, 'non-existent', 'MEMBER' as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('non-existent', updateDto, 'non-existent', 'MEMBER' as any),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    describe('Email Uniqueness', () => {
      it('should throw ConflictException when new email already exists', async () => {
        const user = createMockUser({ email: 'old@example.com' });
        const existingUser = createMockUser({
          id: 'user-456',
          email: 'new@example.com',
        });

        prismaUserService.findOne
          .mockResolvedValueOnce(user) // First call: find user to update
          .mockResolvedValueOnce(null); // Bypass findOne in findByEmail path
        prismaUserService.findByEmail.mockResolvedValueOnce(existingUser); // Check email uniqueness

        const updateDto: UpdateUserDto = { email: 'new@example.com' };

        await expect(
          service.update('user-123', updateDto, 'user-123', 'MEMBER' as any),
        ).rejects.toThrow(ConflictException);
      });

      it('should allow email update when email is unchanged', async () => {
        const user = createMockUser({ email: 'test@example.com' });

        prismaUserService.findOne.mockResolvedValueOnce(user);
        prismaUserService.update.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { email: 'test@example.com' };

        await expect(
          service.update('user-123', updateDto, 'user-123', 'MEMBER' as any),
        ).resolves.toBeDefined();

        // Should NOT call findByEmail since email is unchanged
        expect(prismaUserService.findOne).toHaveBeenCalledTimes(1);
      });

      it('should allow email update when new email is unique', async () => {
        const user = createMockUser({ email: 'old@example.com' });

        prismaUserService.findOne.mockResolvedValueOnce(user); // Find user to update
        prismaUserService.findByEmail.mockResolvedValueOnce(null); // Check email uniqueness (not found)

        prismaUserService.update.mockResolvedValueOnce({
          ...user,
          email: 'new@example.com',
        });

        const updateDto: UpdateUserDto = { email: 'new@example.com' };

        const result = await service.update(
          'user-123',
          updateDto,
          'user-123',
          'MEMBER' as any,
        );

        expect(result).toBeDefined();
        expect(prismaUserService.update).toHaveBeenCalled();
      });

      it('should not check email uniqueness when email is not being updated', async () => {
        const user = createMockUser();
        prismaUserService.findOne.mockResolvedValueOnce(user);
        prismaUserService.update.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        await service.update('user-123', updateDto, 'user-123', 'MEMBER' as any);

        // Should only call findOne once (to find user)
        expect(prismaUserService.findOne).toHaveBeenCalledTimes(1);
      });
    });

    it('should apply updateUserDto to prismaUserService.update', async () => {
      const user = createMockUser({
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'UTC',
      });

      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce({
        ...user,
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/New_York',
        currency: 'EUR',
      });

      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/New_York',
        currency: 'EUR',
      };

      await service.update('user-123', updateDto, 'user-123', 'MEMBER' as any);

      expect(prismaUserService.update).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should return updated UserResponseDto', async () => {
      const user = createMockUser();
      const updatedUser = createMockUser({ firstName: 'Jane' });

      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce(updatedUser);

      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      const result = await service.update(
        'user-123',
        updateDto,
        'user-123',
        'MEMBER' as any,
      );

      expect(result).toMatchObject({
        id: 'user-123',
        firstName: 'Jane',
        fullName: 'Jane Doe',
      });
    });

    it('should update preferences object', async () => {
      const user = createMockUser({ preferences: { theme: 'light' } });
      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce({
        ...user,
        preferences: {
          theme: 'dark',
          notifications: { email: true },
        },
      });

      const updateDto: UpdateUserDto = {
        preferences: {
          theme: 'dark',
          notifications: { email: true },
        },
      };

      await service.update('user-123', updateDto, 'user-123', 'MEMBER' as any);

      expect(prismaUserService.update).toHaveBeenCalledWith('user-123', updateDto);
    });
  });

  describe('updateStatus', () => {
    it('should throw ForbiddenException when non-admin tries to update status', async () => {
      const updateStatusDto: UpdateUserStatusDto = {
        status: 'SUSPENDED' as any,
      };

      await expect(
        service.updateStatus('user-123', updateStatusDto, 'MEMBER' as any),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateStatus('user-123', updateStatusDto, 'MEMBER' as any),
      ).rejects.toThrow('Only administrators can change user status');
    });

    it('should allow admin to update status', async () => {
      const user = createMockUser({ status: 'ACTIVE' as any });
      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce({
        ...user,
        status: 'SUSPENDED' as any,
      });

      const updateStatusDto: UpdateUserStatusDto = {
        status: 'SUSPENDED' as any,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        'ADMIN' as any,
      );

      expect(result).toBeDefined();
      expect(prismaUserService.update).toHaveBeenCalledWith('user-123', {
        status: 'SUSPENDED' as any,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaUserService.findOne.mockResolvedValueOnce(null);

      const updateStatusDto: UpdateUserStatusDto = {
        status: 'SUSPENDED' as any,
      };

      await expect(
        service.updateStatus('non-existent', updateStatusDto, 'ADMIN' as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateStatus('non-existent', updateStatusDto, 'ADMIN' as any),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should update user status to INACTIVE', async () => {
      const user = createMockUser({ status: 'ACTIVE' as any });
      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce({
        ...user,
        status: 'INACTIVE' as any,
      });

      const updateStatusDto: UpdateUserStatusDto = {
        status: 'INACTIVE' as any,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        'ADMIN' as any,
      );

      expect(result).toMatchObject({
        status: 'INACTIVE' as any,
      });
    });

    it('should return updated UserResponseDto', async () => {
      const user = createMockUser();
      const updatedUser = createMockUser({ status: 'SUSPENDED' as any });

      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.update.mockResolvedValueOnce(updatedUser);

      const updateStatusDto: UpdateUserStatusDto = {
        status: 'SUSPENDED' as any,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        'ADMIN' as any,
      );

      expect(result).toMatchObject({
        id: 'user-123',
        status: 'SUSPENDED' as any,
        fullName: 'John Doe',
        isEmailVerified: true,
      });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when non-admin tries to delete', async () => {
      await expect(service.remove('user-123', 'MEMBER' as any)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.remove('user-123', 'MEMBER' as any)).rejects.toThrow(
        'Only administrators can delete users',
      );
    });

    it('should allow admin to delete user', async () => {
      const user = createMockUser();
      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.delete.mockResolvedValueOnce(undefined);

      await expect(
        service.remove('user-123', 'ADMIN' as any),
      ).resolves.toBeUndefined();

      expect(prismaUserService.delete).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaUserService.findOne.mockResolvedValueOnce(null);

      await expect(
        service.remove('non-existent', 'ADMIN' as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.remove('non-existent', 'ADMIN' as any),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should call prismaUserService.delete with user ID', async () => {
      const user = createMockUser({ id: 'user-to-delete' });
      prismaUserService.findOne.mockResolvedValueOnce(user);
      prismaUserService.delete.mockResolvedValueOnce(undefined);

      await service.remove('user-to-delete', 'ADMIN' as any);

      expect(prismaUserService.delete).toHaveBeenCalledWith('user-to-delete');
    });
  });

  describe('getStats', () => {
    it('should return user statistics by status', async () => {
      prismaUserService.countByStatus.mockResolvedValueOnce({
        total: 100,
        active: 80,
        inactive: 15,
        suspended: 5,
      });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 15,
        suspended: 5,
      });

      expect(prismaUserService.countByStatus).toHaveBeenCalledTimes(1);
    });

    it('should delegate to prismaUserService.countByStatus', async () => {
      prismaUserService.countByStatus.mockResolvedValueOnce({
        total: 50,
        active: 40,
        inactive: 8,
        suspended: 2,
      });

      await service.getStats();

      expect(prismaUserService.countByStatus).toHaveBeenCalled();
    });

    it('should return correct format from countByStatus', async () => {
      prismaUserService.countByStatus.mockResolvedValueOnce({
        total: 10,
        active: 8,
        inactive: 1,
        suspended: 1,
      });

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.active).toBe(8);
      expect(result.inactive).toBe(1);
      expect(result.suspended).toBe(1);
    });

    it('should handle zero counts', async () => {
      prismaUserService.countByStatus.mockResolvedValueOnce({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
      });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
      });
    });
  });

  describe('toResponseDto (private method)', () => {
    it('should map all entity fields including virtual properties', async () => {
      const user = createMockUser({
        id: 'user-789',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'EUR',
        preferences: { theme: 'dark' },
        lastLoginAt: new Date('2024-06-15'),
        emailVerifiedAt: new Date('2024-01-10'),
      });

      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-789');

      expect(result).toMatchObject({
        id: 'user-789',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'EUR',
        preferences: { theme: 'dark' },
        isEmailVerified: true,
        isActive: true,
      });

      expect(result).toHaveProperty('lastLoginAt');
      expect(result).toHaveProperty('emailVerifiedAt');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should handle unverified email', async () => {
      const user = createMockUser({ emailVerifiedAt: null });
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.isEmailVerified).toBe(false);
    });

    it('should handle inactive status', async () => {
      const user = createMockUser({ status: 'INACTIVE' as any });
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.isActive).toBe(false);
    });

    it('should handle suspended status', async () => {
      const user = createMockUser({ status: 'SUSPENDED' as any });
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.isActive).toBe(false);
    });

    it('should handle null optional fields', async () => {
      const user = createMockUser({
        avatar: null,
        timezone: null,
        lastLoginAt: null,
        preferences: null,
      });
      prismaUserService.findOneWithRelations.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.avatar).toBeNull();
      expect(result.timezone).toBeNull();
      expect(result.lastLoginAt).toBeNull();
      expect(result.preferences).toBeNull();
    });
  });
});
