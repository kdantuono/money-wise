import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { User, UserRole, UserStatus } from '../../../src/core/database/entities/user.entity';
import { UpdateUserDto, UpdateUserStatusDto } from '../../../src/users/dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  // Mock Repository
  const mockUserRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  // Helper to create mock user
  const createMockUser = (partial: Partial<User> = {}): User => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      avatar: null,
      timezone: 'UTC',
      currency: 'USD',
      preferences: {},
      lastLoginAt: null,
      emailVerifiedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      accounts: [],
      ...partial,
    } as User;

    // Virtual properties (getters)
    Object.defineProperty(user, 'fullName', {
      get: () => `${user.firstName} ${user.lastName}`,
      configurable: true,
    });
    Object.defineProperty(user, 'isEmailVerified', {
      get: () => user.emailVerifiedAt !== null,
      configurable: true,
    });
    Object.defineProperty(user, 'isActive', {
      get: () => user.status === UserStatus.ACTIVE,
      configurable: true,
    });

    return user;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
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
      mockUserRepository.findAndCount.mockResolvedValueOnce([users, 25]);

      const result = await service.findAll();

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0, // (1 - 1) * 10
        take: 10,
        order: { createdAt: 'DESC' },
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
      mockUserRepository.findAndCount.mockResolvedValueOnce([users, 40]);

      const result = await service.findAll(2, 20);

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 20, // (2 - 1) * 20
        take: 20,
        order: { createdAt: 'DESC' },
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(2); // Math.ceil(40 / 20)
    });

    it('should calculate skip correctly for page 3', async () => {
      mockUserRepository.findAndCount.mockResolvedValueOnce([[], 100]);

      await service.findAll(3, 15);

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 30, // (3 - 1) * 15
        take: 15,
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle empty results', async () => {
      mockUserRepository.findAndCount.mockResolvedValueOnce([[], 0]);

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
        status: UserStatus.ACTIVE,
      });
      mockUserRepository.findAndCount.mockResolvedValueOnce([[user], 1]);

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
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        relations: ['accounts'],
      });

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

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
        status: UserStatus.ACTIVE,
      });
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result).toHaveProperty('fullName', 'John Doe');
      expect(result).toHaveProperty('isEmailVerified', true);
      expect(result).toHaveProperty('isActive', true);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const user = createMockUser();
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findByEmail('test@example.com');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    describe('Authorization', () => {
      it('should allow user to update their own profile', async () => {
        const user = createMockUser();
        mockUserRepository.findOne.mockResolvedValueOnce(user);
        mockUserRepository.save.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        const result = await service.update(
          'user-123',
          updateDto,
          'user-123',
          UserRole.USER,
        );

        expect(result).toBeDefined();
        expect(mockUserRepository.save).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when user tries to update another user', async () => {
        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        await expect(
          service.update('user-456', updateDto, 'user-123', UserRole.USER),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          service.update('user-456', updateDto, 'user-123', UserRole.USER),
        ).rejects.toThrow('You can only update your own profile');
      });

      it('should allow admin to update any user profile', async () => {
        const user = createMockUser({ id: 'user-456' });
        mockUserRepository.findOne.mockResolvedValueOnce(user);
        mockUserRepository.save.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        const result = await service.update(
          'user-456',
          updateDto,
          'admin-123',
          UserRole.ADMIN,
        );

        expect(result).toBeDefined();
        expect(mockUserRepository.save).toHaveBeenCalled();
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      await expect(
        service.update('non-existent', updateDto, 'non-existent', UserRole.USER),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update('non-existent', updateDto, 'non-existent', UserRole.USER),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    describe('Email Uniqueness', () => {
      it('should throw ConflictException when new email already exists', async () => {
        const user = createMockUser({ email: 'old@example.com' });
        const existingUser = createMockUser({
          id: 'user-456',
          email: 'new@example.com',
        });

        mockUserRepository.findOne
          .mockResolvedValueOnce(user) // First call: find user to update
          .mockResolvedValueOnce(existingUser); // Second call: check email uniqueness

        const updateDto: UpdateUserDto = { email: 'new@example.com' };

        await expect(
          service.update('user-123', updateDto, 'user-123', UserRole.USER),
        ).rejects.toThrow(ConflictException);
      });

      it('should allow email update when email is unchanged', async () => {
        const user = createMockUser({ email: 'test@example.com' });

        mockUserRepository.findOne.mockResolvedValueOnce(user);
        mockUserRepository.save.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { email: 'test@example.com' };

        await expect(
          service.update('user-123', updateDto, 'user-123', UserRole.USER),
        ).resolves.toBeDefined();

        // Should NOT call findByEmail since email is unchanged
        expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      });

      it('should allow email update when new email is unique', async () => {
        const user = createMockUser({ email: 'old@example.com' });

        mockUserRepository.findOne
          .mockResolvedValueOnce(user) // First call: find user to update
          .mockResolvedValueOnce(null); // Second call: check email uniqueness (not found)

        mockUserRepository.save.mockResolvedValueOnce({
          ...user,
          email: 'new@example.com',
        });

        const updateDto: UpdateUserDto = { email: 'new@example.com' };

        const result = await service.update(
          'user-123',
          updateDto,
          'user-123',
          UserRole.USER,
        );

        expect(result).toBeDefined();
        expect(mockUserRepository.save).toHaveBeenCalled();
      });

      it('should not check email uniqueness when email is not being updated', async () => {
        const user = createMockUser();
        mockUserRepository.findOne.mockResolvedValueOnce(user);
        mockUserRepository.save.mockResolvedValueOnce(user);

        const updateDto: UpdateUserDto = { firstName: 'Jane' };

        await service.update('user-123', updateDto, 'user-123', UserRole.USER);

        // Should only call findOne once (to find user)
        expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      });
    });

    it('should apply updateUserDto with Object.assign', async () => {
      const user = createMockUser({
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'UTC',
      });

      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockImplementation(async (entity) => entity as User);

      const updateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/New_York',
        currency: 'EUR',
      };

      await service.update('user-123', updateDto, 'user-123', UserRole.USER);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          timezone: 'America/New_York',
          currency: 'EUR',
        }),
      );
    });

    it('should return updated UserResponseDto', async () => {
      const user = createMockUser();
      const updatedUser = createMockUser({ firstName: 'Jane' });

      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockResolvedValueOnce(updatedUser);

      const updateDto: UpdateUserDto = { firstName: 'Jane' };

      const result = await service.update(
        'user-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );

      expect(result).toMatchObject({
        id: 'user-123',
        firstName: 'Jane',
        fullName: 'Jane Doe',
      });
    });

    it('should update preferences object', async () => {
      const user = createMockUser({ preferences: { theme: 'light' } });
      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockImplementation(async (entity) => entity as User);

      const updateDto: UpdateUserDto = {
        preferences: {
          theme: 'dark',
          notifications: { email: true },
        },
      };

      await service.update('user-123', updateDto, 'user-123', UserRole.USER);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: {
            theme: 'dark',
            notifications: { email: true },
          },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should throw ForbiddenException when non-admin tries to update status', async () => {
      const updateStatusDto: UpdateUserStatusDto = {
        status: UserStatus.SUSPENDED,
      };

      await expect(
        service.updateStatus('user-123', updateStatusDto, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateStatus('user-123', updateStatusDto, UserRole.USER),
      ).rejects.toThrow('Only administrators can change user status');
    });

    it('should allow admin to update status', async () => {
      const user = createMockUser({ status: UserStatus.ACTIVE });
      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockResolvedValueOnce({
        ...user,
        status: UserStatus.SUSPENDED,
      });

      const updateStatusDto: UpdateUserStatusDto = {
        status: UserStatus.SUSPENDED,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        UserRole.ADMIN,
      );

      expect(result).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.SUSPENDED,
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const updateStatusDto: UpdateUserStatusDto = {
        status: UserStatus.SUSPENDED,
      };

      await expect(
        service.updateStatus('non-existent', updateStatusDto, UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateStatus('non-existent', updateStatusDto, UserRole.ADMIN),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should update user status to INACTIVE', async () => {
      const user = createMockUser({ status: UserStatus.ACTIVE });
      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockResolvedValueOnce({
        ...user,
        status: UserStatus.INACTIVE,
      });

      const updateStatusDto: UpdateUserStatusDto = {
        status: UserStatus.INACTIVE,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        UserRole.ADMIN,
      );

      expect(result).toMatchObject({
        status: UserStatus.INACTIVE,
      });
    });

    it('should return updated UserResponseDto', async () => {
      const user = createMockUser();
      const updatedUser = createMockUser({ status: UserStatus.SUSPENDED });

      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.save.mockResolvedValueOnce(updatedUser);

      const updateStatusDto: UpdateUserStatusDto = {
        status: UserStatus.SUSPENDED,
      };

      const result = await service.updateStatus(
        'user-123',
        updateStatusDto,
        UserRole.ADMIN,
      );

      expect(result).toMatchObject({
        id: 'user-123',
        status: UserStatus.SUSPENDED,
        fullName: 'John Doe',
        isEmailVerified: true,
      });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when non-admin tries to delete', async () => {
      await expect(service.remove('user-123', UserRole.USER)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.remove('user-123', UserRole.USER)).rejects.toThrow(
        'Only administrators can delete users',
      );
    });

    it('should allow admin to delete user', async () => {
      const user = createMockUser();
      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.remove.mockResolvedValueOnce(user);

      await expect(
        service.remove('user-123', UserRole.ADMIN),
      ).resolves.toBeUndefined();

      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.remove('non-existent', UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.remove('non-existent', UserRole.ADMIN),
      ).rejects.toThrow('User with ID non-existent not found');
    });

    it('should call repository.remove with user entity', async () => {
      const user = createMockUser({ id: 'user-to-delete' });
      mockUserRepository.findOne.mockResolvedValueOnce(user);
      mockUserRepository.remove.mockResolvedValueOnce(user);

      await service.remove('user-to-delete', UserRole.ADMIN);

      expect(mockUserRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-to-delete' }),
      );
    });
  });

  describe('getStats', () => {
    it('should return user statistics by status', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(15) // inactive
        .mockResolvedValueOnce(5); // suspended

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 15,
        suspended: 5,
      });

      expect(mockUserRepository.count).toHaveBeenCalledTimes(4);
    });

    it('should call count with correct where clauses', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2);

      await service.getStats();

      expect(mockUserRepository.count).toHaveBeenNthCalledWith(1); // total (no where)
      expect(mockUserRepository.count).toHaveBeenNthCalledWith(2, {
        where: { status: UserStatus.ACTIVE },
      });
      expect(mockUserRepository.count).toHaveBeenNthCalledWith(3, {
        where: { status: UserStatus.INACTIVE },
      });
      expect(mockUserRepository.count).toHaveBeenNthCalledWith(4, {
        where: { status: UserStatus.SUSPENDED },
      });
    });

    it('should use Promise.all for parallel counts', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.active).toBe(8);
      expect(result.inactive).toBe(1);
      expect(result.suspended).toBe(1);
    });

    it('should handle zero counts', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

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
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        avatar: 'https://example.com/avatar.jpg',
        timezone: 'America/New_York',
        currency: 'EUR',
        preferences: { theme: 'dark' },
        lastLoginAt: new Date('2024-06-15'),
        emailVerifiedAt: new Date('2024-01-10'),
      });

      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-789');

      expect(result).toMatchObject({
        id: 'user-789',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
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
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.isEmailVerified).toBe(false);
    });

    it('should handle inactive status', async () => {
      const user = createMockUser({ status: UserStatus.INACTIVE });
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.isActive).toBe(false);
    });

    it('should handle suspended status', async () => {
      const user = createMockUser({ status: UserStatus.SUSPENDED });
      mockUserRepository.findOne.mockResolvedValueOnce(user);

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
      mockUserRepository.findOne.mockResolvedValueOnce(user);

      const result = await service.findOne('user-123');

      expect(result.avatar).toBeNull();
      expect(result.timezone).toBeNull();
      expect(result.lastLoginAt).toBeNull();
      expect(result.preferences).toBeNull();
    });
  });
});
