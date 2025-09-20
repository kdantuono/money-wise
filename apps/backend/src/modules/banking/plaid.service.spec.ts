import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlaidApi } from 'plaid';
import { Repository } from 'typeorm';

import { User } from '../auth/user.entity';

import { PlaidAccount } from './entities/plaid-account.entity';
import { PlaidTransaction } from './entities/plaid-transaction.entity';
import { PlaidService } from './plaid.service';



describe('PlaidService', () => {
  let service: PlaidService;
  let plaidAccountRepository: Repository<PlaidAccount>;
  let plaidTransactionRepository: Repository<PlaidTransaction>;
  let userRepository: Repository<User>;
  let configService: ConfigService;
  let plaidApi: PlaidApi;

  const mockPlaidAccountRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockPlaidTransactionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPlaidApi = {
    linkTokenCreate: jest.fn(),
    itemPublicTokenExchange: jest.fn(),
    accountsGet: jest.fn(),
    transactionsGet: jest.fn(),
    transactionsSync: jest.fn(),
    institutionsGetById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaidService,
        {
          provide: getRepositoryToken(PlaidAccount),
          useValue: mockPlaidAccountRepository,
        },
        {
          provide: getRepositoryToken(PlaidTransaction),
          useValue: mockPlaidTransactionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'PLAID_API',
          useValue: mockPlaidApi,
        },
      ],
    }).compile();

    service = module.get<PlaidService>(PlaidService);
    plaidAccountRepository = module.get<Repository<PlaidAccount>>(
      getRepositoryToken(PlaidAccount)
    );
    plaidTransactionRepository = module.get<Repository<PlaidTransaction>>(
      getRepositoryToken(PlaidTransaction)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);
    plaidApi = module.get('PLAID_API');

    // Setup default config mock responses
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        PLAID_CLIENT_ID: 'test_client_id',
        PLAID_SECRET: 'test_secret',
        PLAID_ENV: 'sandbox',
        PLAID_PRODUCTS: 'transactions,auth',
        PLAID_COUNTRY_CODES: 'US',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializePlaidLink', () => {
    const userId = 'test-user-id';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    } as User;

    it('should create link token for valid user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPlaidApi.linkTokenCreate.mockResolvedValue({
        data: {
          link_token: 'link-sandbox-test-token',
          expiration: '2024-01-01T00:00:00Z',
          request_id: 'test-request-id',
        },
      });

      // Act
      const result = await service.initializePlaidLink(userId);

      // Assert
      expect(result).toEqual({
        linkToken: 'link-sandbox-test-token',
        expiration: '2024-01-01T00:00:00Z',
        requestId: 'test-request-id',
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPlaidApi.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: userId },
        client_name: 'MoneyWise',
        products: ['transactions', 'auth'],
        country_codes: ['US'],
        language: 'en',
      });
    });

    it('should handle invalid user gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.initializePlaidLink(userId)).rejects.toThrow(
        'User not found'
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPlaidApi.linkTokenCreate).not.toHaveBeenCalled();
    });

    it('should handle Plaid API errors', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPlaidApi.linkTokenCreate.mockRejectedValue(
        new Error('Plaid API Error')
      );

      // Act & Assert
      await expect(service.initializePlaidLink(userId)).rejects.toThrow(
        'Plaid API Error'
      );
    });
  });

  describe('exchangePublicToken', () => {
    const userId = 'test-user-id';
    const publicToken = 'public-sandbox-test-token';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    } as User;

    it('should exchange public token and save account data', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPlaidApi.itemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
          request_id: 'test-request-id',
        },
      });
      mockPlaidApi.accountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'test-account-id',
              name: 'Test Checking',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 1000.5,
                available: 950.5,
                iso_currency_code: 'USD',
              },
            },
          ],
          item: { institution_id: 'test-institution-id' },
        },
      });
      mockPlaidApi.institutionsGetById.mockResolvedValue({
        data: {
          institution: {
            name: 'Test Bank',
            institution_id: 'test-institution-id',
          },
        },
      });
      mockPlaidAccountRepository.create.mockReturnValue({});
      mockPlaidAccountRepository.save.mockResolvedValue({
        id: 'saved-account-id',
        plaidAccountId: 'test-account-id',
        institutionName: 'Test Bank',
      });

      // Act
      const result = await service.exchangePublicToken(userId, publicToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accounts).toHaveLength(1);
      expect(mockPlaidApi.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: publicToken,
      });
      expect(mockPlaidAccountRepository.save).toHaveBeenCalled();
    });

    it('should handle duplicate account gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPlaidApi.itemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
          request_id: 'test-request-id',
        },
      });
      mockPlaidApi.accountsGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'test-account-id',
              name: 'Test Checking',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 1000.5,
                available: 950.5,
                iso_currency_code: 'USD',
              },
            },
          ],
          item: { institution_id: 'test-institution-id' },
        },
      });
      mockPlaidApi.institutionsGetById.mockResolvedValue({
        data: {
          institution: {
            name: 'Test Bank',
            institution_id: 'test-institution-id',
          },
        },
      });
      mockPlaidAccountRepository.create.mockReturnValue({});
      const duplicateError = new Error('Duplicate key') as any;
      duplicateError.code = '23505';
      mockPlaidAccountRepository.save.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(
        service.exchangePublicToken(userId, publicToken)
      ).rejects.toThrow();
    });
  });

  describe('syncTransactions', () => {
    const accountId = 'test-account-id';
    const mockPlaidAccount = {
      id: accountId,
      plaidAccountId: 'plaid-account-id',
      accessToken: 'access-token',
      cursor: null,
      userId: 'user-id',
    } as PlaidAccount;

    it('should sync new transactions only', async () => {
      // Arrange
      mockPlaidAccountRepository.findOne.mockResolvedValue(mockPlaidAccount);
      mockPlaidApi.transactionsSync.mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: 'txn-1',
              account_id: 'plaid-account-id',
              amount: 25.99,
              date: '2024-01-01',
              description: 'Test Transaction',
              merchant_name: 'Test Merchant',
              category: ['Food and Drink', 'Restaurants'],
              pending: false,
            },
          ],
          modified: [],
          removed: [],
          next_cursor: 'next-cursor-token',
          has_next: false,
        },
      });
      mockPlaidTransactionRepository.upsert.mockResolvedValue({});
      mockPlaidAccountRepository.update.mockResolvedValue({});

      // Act
      const result = await service.syncTransactions(accountId);

      // Assert
      expect(result).toEqual({
        accountId,
        transactionsAdded: 1,
        transactionsModified: 0,
        transactionsRemoved: 0,
        lastSyncAt: expect.any(Date),
        status: 'success',
      });
      expect(mockPlaidTransactionRepository.upsert).toHaveBeenCalled();
      expect(mockPlaidAccountRepository.update).toHaveBeenCalledWith(
        accountId,
        {
          cursor: 'next-cursor-token',
          lastSyncAt: expect.any(Date),
        }
      );
    });

    it('should handle duplicate transactions', async () => {
      // Arrange
      mockPlaidAccountRepository.findOne.mockResolvedValue(mockPlaidAccount);
      mockPlaidApi.transactionsSync.mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: 'existing-txn-1',
              account_id: 'plaid-account-id',
              amount: 25.99,
              date: '2024-01-01',
              description: 'Duplicate Transaction',
            },
          ],
          modified: [],
          removed: [],
          next_cursor: 'next-cursor-token',
          has_next: false,
        },
      });
      mockPlaidTransactionRepository.upsert.mockResolvedValue({});

      // Act
      const result = await service.syncTransactions(accountId);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPlaidTransactionRepository.upsert).toHaveBeenCalled();
    });

    it('should handle account not found', async () => {
      // Arrange
      mockPlaidAccountRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.syncTransactions(accountId)).rejects.toThrow(
        'Plaid account not found'
      );
    });
  });

  describe('getAccountsByUser', () => {
    const userId = 'test-user-id';

    it('should return user accounts with transaction counts', async () => {
      // Arrange
      const mockAccounts = [
        {
          id: 'account-1',
          plaidAccountId: 'plaid-account-1',
          institutionName: 'Test Bank',
          accountName: 'Checking',
          currentBalance: 1000,
          transactions: [{ id: 'txn-1' }, { id: 'txn-2' }],
        },
      ];
      mockPlaidAccountRepository.find.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccountsByUser(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'account-1',
        plaidAccountId: 'plaid-account-1',
        institutionName: 'Test Bank',
        accountName: 'Checking',
        currentBalance: 1000,
        transactionCount: 2,
      });
    });

    it('should return empty array for user with no accounts', async () => {
      // Arrange
      mockPlaidAccountRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getAccountsByUser(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('handleWebhook', () => {
    const webhookData = {
      webhookType: 'TRANSACTIONS',
      webhookCode: 'DEFAULT_UPDATE',
      itemId: 'test-item-id',
      newTransactions: 5,
    };

    it('should process transaction webhook successfully', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-id',
        plaidItemId: 'test-item-id',
      } as PlaidAccount;
      mockPlaidAccountRepository.findOne.mockResolvedValue(mockAccount);
      jest.spyOn(service, 'syncTransactions').mockResolvedValue({
        accountId: 'account-id',
        transactionsAdded: 5,
        transactionsModified: 0,
        transactionsRemoved: 0,
        lastSyncAt: new Date(),
        status: 'success',
      });

      // Act
      const result = await service.handleWebhook(webhookData);

      // Assert
      expect(result).toEqual({
        status: 'processed',
        message: 'Webhook processed successfully',
      });
      expect(service.syncTransactions).toHaveBeenCalledWith('account-id');
    });

    it('should handle unknown webhook types gracefully', async () => {
      // Arrange
      const unknownWebhook = { ...webhookData, webhookType: 'UNKNOWN' };

      // Act
      const result = await service.handleWebhook(unknownWebhook);

      // Assert
      expect(result).toEqual({
        status: 'ignored',
        message: 'Webhook type not supported',
      });
    });
  });

  describe('handlePlaidError', () => {
    it('should handle institution errors with user-friendly messages', async () => {
      // Arrange
      const plaidError = {
        error_code: 'ITEM_LOGIN_REQUIRED',
        error_message: 'User needs to re-authenticate',
        display_message: 'Please reconnect your account',
      };

      // Act
      const result = await service.handlePlaidError(plaidError);

      // Assert
      expect(result).toEqual({
        code: 'ITEM_LOGIN_REQUIRED',
        message: 'Please reconnect your account',
        action: 'RELINK_REQUIRED',
        userFriendly: true,
      });
    });

    it('should handle connectivity errors with retry strategy', async () => {
      // Arrange
      const plaidError = {
        error_code: 'INSTITUTION_DOWN',
        error_message: 'Institution is temporarily unavailable',
        display_message: 'Bank is temporarily unavailable',
      };

      // Act
      const result = await service.handlePlaidError(plaidError);

      // Assert
      expect(result).toEqual({
        code: 'INSTITUTION_DOWN',
        message: 'Bank is temporarily unavailable',
        action: 'RETRY_LATER',
        retryAfter: expect.any(Number),
        userFriendly: true,
      });
    });

    it('should handle rate limit errors with backoff strategy', async () => {
      // Arrange
      const plaidError = {
        error_code: 'RATE_LIMIT_EXCEEDED',
        error_message: 'Rate limit exceeded',
        display_message: 'Too many requests',
      };

      // Act
      const result = await service.handlePlaidError(plaidError);

      // Assert
      expect(result).toEqual({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        action: 'BACKOFF_REQUIRED',
        backoffSeconds: expect.any(Number),
        userFriendly: true,
      });
    });
  });
});
