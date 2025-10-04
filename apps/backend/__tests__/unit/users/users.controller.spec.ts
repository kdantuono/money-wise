import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { UsersController } from '../../../src/users/users.controller';
import { UsersService } from '../../../src/users/users.service';
import { User, UserRole, UserStatus } from '../../../src/core/database/entities/user.entity';
import { UpdateUserDto, UpdateUserStatusDto } from '../../../src/users/dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed_password',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    currency: 'USD',
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

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users for admin', async () => {
      const paginatedResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(1, 10);

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should support custom pagination parameters', async () => {
      const paginatedResponse = {
        users: [mockUser],
        total: 50,
        page: 2,
        limit: 25,
        totalPages: 2,
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(2, 25);

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(2, 25);
    });

    it('should use default pagination when not provided', async () => {
      const paginatedResponse = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResponse);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      const userResponse = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        fullName: mockUser.fullName,
        role: mockUser.role,
        status: mockUser.status,
        currency: mockUser.currency,
        isEmailVerified: mockUser.isEmailVerified,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      mockUsersService.findOne.mockResolvedValue(userResponse);

      const result = await controller.getCurrentUser(mockUser);

      expect(result).toEqual(userResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const stats = {
        total: 100,
        active: 85,
        inactive: 10,
        suspended: 5,
      };

      mockUsersService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      const userResponse = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        fullName: mockUser.fullName,
        role: mockUser.role,
        status: mockUser.status,
        currency: mockUser.currency,
        isEmailVerified: mockUser.isEmailVerified,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      mockUsersService.findOne.mockResolvedValue(userResponse);

      const result = await controller.findOne(mockUser.id);

      expect(result).toEqual(userResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User with ID nonexistent not found')
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      timezone: 'America/New_York',
    };

    it('should allow user to update own profile', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        timezone: updateDto.timezone,
      };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateDto, mockUser);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(
        mockUser.id,
        updateDto,
        mockUser.id,
        mockUser.role
      );
    });

    it('should allow admin to update any user profile', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
      };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateDto, mockAdminUser);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(
        mockUser.id,
        updateDto,
        mockAdminUser.id,
        mockAdminUser.role
      );
    });

    it('should throw ForbiddenException when non-admin tries to update another user', async () => {
      const otherUserId = 'other-user-id';

      mockUsersService.update.mockRejectedValue(
        new ForbiddenException('You can only update your own profile')
      );

      await expect(controller.update(otherUserId, updateDto, mockUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const updateDtoWithEmail: UpdateUserDto = {
        email: 'existing@example.com',
      };

      mockUsersService.update.mockRejectedValue(
        new ConflictException('Email already in use')
      );

      await expect(
        controller.update(mockUser.id, updateDtoWithEmail, mockUser)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User with ID nonexistent not found')
      );

      await expect(controller.update('nonexistent', updateDto, mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateUserStatusDto = {
      status: UserStatus.SUSPENDED,
    };

    it('should allow admin to update user status', async () => {
      const updatedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
      };

      mockUsersService.updateStatus.mockResolvedValue(updatedUser);

      const result = await controller.updateStatus(mockUser.id, updateStatusDto, mockAdminUser);

      expect(result).toEqual(updatedUser);
      expect(service.updateStatus).toHaveBeenCalledWith(
        mockUser.id,
        updateStatusDto,
        mockAdminUser.role
      );
    });

    it('should throw ForbiddenException when non-admin tries to update status', async () => {
      mockUsersService.updateStatus.mockRejectedValue(
        new ForbiddenException('Only administrators can change user status')
      );

      await expect(
        controller.updateStatus(mockUser.id, updateStatusDto, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.updateStatus.mockRejectedValue(
        new NotFoundException('User with ID nonexistent not found')
      );

      await expect(
        controller.updateStatus('nonexistent', updateStatusDto, mockAdminUser)
      ).rejects.toThrow(NotFoundException);
    });

    it('should support all status transitions', async () => {
      const statuses = [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED];

      for (const status of statuses) {
        const dto = { status };
        const updatedUser = { ...mockUser, status };

        mockUsersService.updateStatus.mockResolvedValue(updatedUser);

        const result = await controller.updateStatus(mockUser.id, dto, mockAdminUser);

        expect(result.status).toBe(status);
        expect(service.updateStatus).toHaveBeenCalledWith(mockUser.id, dto, mockAdminUser.role);
      }
    });
  });

  describe('remove', () => {
    it('should allow admin to delete user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser.id, mockAdminUser);

      expect(service.remove).toHaveBeenCalledWith(mockUser.id, mockAdminUser.role);
    });

    it('should throw ForbiddenException when non-admin tries to delete user', async () => {
      mockUsersService.remove.mockRejectedValue(
        new ForbiddenException('Only administrators can delete users')
      );

      await expect(controller.remove(mockUser.id, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('User with ID nonexistent not found')
      );

      await expect(controller.remove('nonexistent', mockAdminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
