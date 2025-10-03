import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { User, UserRole, UserStatus } from '../../../src/core/database/entities/user.entity';
import { UpdateUserDto, UpdateUserStatusDto } from '../../../src/users/dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed_password',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    avatar: null,
    timezone: 'America/New_York',
    currency: 'USD',
    preferences: {},
    lastLoginAt: null,
    emailVerifiedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    accounts: [],
    get fullName() { return `${this.firstName} ${this.lastName}`; },
    get isEmailVerified() { return !!this.emailVerifiedAt; },
    get isActive() { return this.status === UserStatus.ACTIVE; },
  } as User;

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-uuid',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    const mockRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users with default pagination', async () => {
      const users = [mockUser];
      const total = 1;

      repository.findAndCount.mockResolvedValue([users as any, total]);

      const result = await service.findAll();

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        users: [expect.objectContaining({ id: mockUser.id, email: mockUser.email })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return paginated users with custom pagination', async () => {
      const users = [mockUser];
      const total = 25;

      repository.findAndCount.mockResolvedValue([users as any, total]);

      const result = await service.findAll(2, 5);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        order: { createdAt: 'DESC' },
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
    });

    it('should return empty array when no users exist', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll();

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should handle large datasets with proper pagination', async () => {
      const users = Array.from({ length: 20 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
        email: `user${i}@example.com`,
      }));
      const total = 100;

      repository.findAndCount.mockResolvedValue([users as any, total]);

      const result = await service.findAll(3, 20);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 40,
        take: 20,
        order: { createdAt: 'DESC' },
      });
      expect(result.totalPages).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['accounts'],
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        })
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found')
      );
    });

    it('should include accounts relation in response', async () => {
      const userWithAccounts = {
        ...mockUser,
        accounts: [{ id: 'account-1', name: 'Savings' }],
      };
      repository.findOne.mockResolvedValue(userWithAccounts as any);

      await service.findOne(mockUser.id);

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['accounts'],
        })
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should allow user to update their own profile', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, ...updateDto };
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        mockUser.id,
        updateDto,
        mockUser.id,
        UserRole.USER
      );

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto)
      );
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should allow admin to update any user profile', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, ...updateDto };
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        mockUser.id,
        updateDto,
        mockAdminUser.id,
        UserRole.ADMIN
      );

      expect(result.firstName).toBe('Updated');
    });

    it('should throw ForbiddenException when non-admin tries to update another user', async () => {
      await expect(
        service.update(
          mockUser.id,
          updateDto,
          'different-user-id',
          UserRole.USER
        )
      ).rejects.toThrow(
        new ForbiddenException('You can only update your own profile')
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          'non-existent-id',
          updateDto,
          'non-existent-id',
          UserRole.USER
        )
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found')
      );
    });

    it('should check email uniqueness when updating email', async () => {
      const newEmail = 'newemail@example.com';
      const updateWithEmail: UpdateUserDto = { email: newEmail };

      repository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null); // No existing user with new email

      const updatedUser = { ...mockUser, email: newEmail };
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        mockUser.id,
        updateWithEmail,
        mockUser.id,
        UserRole.USER
      );

      expect(result.email).toBe(newEmail);
    });

    it('should throw ConflictException when email already in use', async () => {
      const existingUser: any = { ...mockUser, id: 'other-user-id' };
      const updateWithEmail: UpdateUserDto = { email: existingUser.email };

      repository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);

      await expect(
        service.update(
          mockUser.id,
          updateWithEmail,
          mockUser.id,
          UserRole.USER
        )
      ).rejects.toThrow(
        new ConflictException('Email already in use')
      );
    });

    it('should not check email uniqueness when email unchanged', async () => {
      const updateWithSameEmail: UpdateUserDto = {
        email: mockUser.email,
        firstName: 'Updated'
      };

      repository.findOne.mockResolvedValueOnce(mockUser);
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      repository.save.mockResolvedValue(updatedUser as any);

      await service.update(
        mockUser.id,
        updateWithSameEmail,
        mockUser.id,
        UserRole.USER
      );

      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should update multiple fields at once', async () => {
      const multiFieldUpdate: UpdateUserDto = {
        firstName: 'New',
        lastName: 'Name',
        timezone: 'Europe/London',
        currency: 'GBP',
      };

      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, ...multiFieldUpdate };
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        mockUser.id,
        multiFieldUpdate,
        mockUser.id,
        UserRole.USER
      );

      expect(result.firstName).toBe('New');
      expect(result.timezone).toBe('Europe/London');
      expect(result.currency).toBe('GBP');
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateUserStatusDto = {
      status: UserStatus.SUSPENDED,
    };

    it('should allow admin to update user status', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateStatus(
        mockUser.id,
        updateStatusDto,
        UserRole.ADMIN
      );

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED })
      );
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it('should throw ForbiddenException when non-admin tries to update status', async () => {
      await expect(
        service.updateStatus(
          mockUser.id,
          updateStatusDto,
          UserRole.USER
        )
      ).rejects.toThrow(
        new ForbiddenException('Only administrators can change user status')
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'non-existent-id',
          updateStatusDto,
          UserRole.ADMIN
        )
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found')
      );
    });

    it('should update status to ACTIVE', async () => {
      const inactiveUser: User = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get fullName() { return `${this.firstName} ${this.lastName}`; },
        get isEmailVerified() { return !!this.emailVerifiedAt; },
        get isActive() { return this.status === UserStatus.ACTIVE; },
      } as User;
      repository.findOne.mockResolvedValue(inactiveUser);
      const updatedUser: User = {
        ...inactiveUser,
        status: UserStatus.ACTIVE,
        get fullName() { return `${this.firstName} ${this.lastName}`; },
        get isEmailVerified() { return !!this.emailVerifiedAt; },
        get isActive() { return this.status === UserStatus.ACTIVE; },
      } as User;
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateStatus(
        mockUser.id,
        { status: UserStatus.ACTIVE },
        UserRole.ADMIN
      );

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should update status to INACTIVE', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser: User = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        get fullName() { return `${this.firstName} ${this.lastName}`; },
        get isEmailVerified() { return !!this.emailVerifiedAt; },
        get isActive() { return this.status === UserStatus.ACTIVE; },
      } as User;
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.updateStatus(
        mockUser.id,
        { status: UserStatus.INACTIVE },
        UserRole.ADMIN
      );

      expect(result.status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('remove', () => {
    it('should allow admin to delete user', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.remove.mockResolvedValue(mockUser);

      await service.remove(mockUser.id, UserRole.ADMIN);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(repository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ForbiddenException when non-admin tries to delete user', async () => {
      await expect(
        service.remove(mockUser.id, UserRole.USER)
      ).rejects.toThrow(
        new ForbiddenException('Only administrators can delete users')
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', UserRole.ADMIN)
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found')
      );
    });

    it('should not call repository.remove when authorization fails', async () => {
      await expect(
        service.remove(mockUser.id, UserRole.USER)
      ).rejects.toThrow(ForbiddenException);

      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      repository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85)  // active
        .mockResolvedValueOnce(10)  // inactive
        .mockResolvedValueOnce(5);  // suspended

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        active: 85,
        inactive: 10,
        suspended: 5,
      });
      expect(repository.count).toHaveBeenCalledTimes(4);
    });

    it('should return zero stats when no users exist', async () => {
      repository.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
      });
    });

    it('should call count with correct status filters', async () => {
      repository.count.mockResolvedValue(0);

      await service.getStats();

      expect(repository.count).toHaveBeenNthCalledWith(1);
      expect(repository.count).toHaveBeenNthCalledWith(2, { where: { status: UserStatus.ACTIVE } });
      expect(repository.count).toHaveBeenNthCalledWith(3, { where: { status: UserStatus.INACTIVE } });
      expect(repository.count).toHaveBeenNthCalledWith(4, { where: { status: UserStatus.SUSPENDED } });
    });
  });

  describe('toResponseDto (private method - tested through public methods)', () => {
    it('should map user to response DTO correctly', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        fullName: mockUser.fullName,
        role: mockUser.role,
        status: mockUser.status,
        avatar: mockUser.avatar,
        timezone: mockUser.timezone,
        currency: mockUser.currency,
        preferences: mockUser.preferences,
        lastLoginAt: mockUser.lastLoginAt,
        emailVerifiedAt: mockUser.emailVerifiedAt,
        isEmailVerified: mockUser.isEmailVerified,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should exclude sensitive fields like passwordHash', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should include computed properties', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result.fullName).toBe('Test User');
      expect(result.isEmailVerified).toBe(true);
      expect(result.isActive).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle repository errors gracefully', async () => {
      repository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findOne(mockUser.id)).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid UUID format', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should handle save errors during update', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockRejectedValue(new Error('Constraint violation'));

      await expect(
        service.update(mockUser.id, { firstName: 'Test' }, mockUser.id, UserRole.USER)
      ).rejects.toThrow('Constraint violation');
    });

    it('should handle concurrent update scenarios', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const updatedUser: User = {
        ...mockUser,
        updatedAt: new Date(),
        get fullName() { return `${this.firstName} ${this.lastName}`; },
        get isEmailVerified() { return !!this.emailVerifiedAt; },
        get isActive() { return this.status === UserStatus.ACTIVE; },
      } as User;
      repository.save.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        mockUser.id,
        { firstName: 'Updated' },
        mockUser.id,
        UserRole.USER
      );

      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
});
