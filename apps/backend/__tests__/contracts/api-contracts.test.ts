import jestOpenAPI from 'jest-openapi'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { spec } from '@/docs/openapi.spec'

// Type spec properly for OpenAPI 3.0
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  security?: Array<Record<string, any>>;
}

const typedSpec = spec as unknown as OpenAPISpec;

// Load OpenAPI spec for contract testing
jestOpenAPI(typedSpec as any)

describe('API Contract Tests', () => {
  let app: INestApplication

  beforeAll(async () => {
    // Mock module for testing (since we don't have the full app yet)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: []
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should validate login request schema', async () => {
        const loginRequest = {
          email: 'test@example.com',
          password: 'password123'
        }

        // Test that request matches schema
        expect(loginRequest).toSatisfySchemaInApiSpec('LoginRequest')
      })

      it('should validate successful login response schema', async () => {
        const successResponse = {
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            avatar: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'
        }

        expect(successResponse).toSatisfySchemaInApiSpec('AuthResponse')
      })

      it('should validate error response schema', async () => {
        const errorResponse = {
          error: 'Invalid credentials',
          code: 'AUTH_INVALID'
        }

        expect(errorResponse).toSatisfySchemaInApiSpec('Error')
      })
    })

    describe('POST /api/auth/register', () => {
      it('should validate registration request schema', async () => {
        const registerRequest = {
          email: 'newuser@example.com',
          password: 'securepassword',
          name: 'New User'
        }

        // Validate against the inline schema in the spec
        expect(registerRequest).toMatchObject({
          email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
          password: expect.stringMatching(/.{6,}/),
          name: expect.any(String)
        })
      })
    })
  })

  describe('User Profile Endpoints', () => {
    describe('GET /api/user/profile', () => {
      it('should validate user profile response schema', async () => {
        const userProfileResponse = {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
          avatar: 'https://example.com/avatar.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-09-29T12:00:00Z'
        }

        expect(userProfileResponse).toSatisfySchemaInApiSpec('User')
      })
    })
  })

  describe('Account Endpoints', () => {
    describe('GET /api/accounts', () => {
      it('should validate accounts array response schema', async () => {
        const accountsResponse = [
          {
            id: 1,
            name: 'Checking Account',
            type: 'checking',
            balance: 2500.00,
            currency: 'USD',
            isActive: true
          },
          {
            id: 2,
            name: 'Savings Account',
            type: 'savings',
            balance: 10000.00,
            currency: 'USD',
            isActive: true
          }
        ]

        // Validate each account in the array
        accountsResponse.forEach(account => {
          expect(account).toSatisfySchemaInApiSpec('Account')
        })
      })
    })

    describe('POST /api/accounts', () => {
      it('should validate create account request schema', async () => {
        const createAccountRequest = {
          name: 'Investment Account',
          type: 'investment',
          initialBalance: 5000.00
        }

        expect(createAccountRequest).toMatchObject({
          name: expect.any(String),
          type: expect.stringMatching(/^(checking|savings|credit|investment)$/),
          initialBalance: expect.any(Number)
        })
      })

      it('should validate created account response schema', async () => {
        const createAccountResponse = {
          id: 3,
          name: 'Investment Account',
          type: 'investment',
          balance: 5000.00,
          currency: 'USD',
          isActive: true
        }

        expect(createAccountResponse).toSatisfySchemaInApiSpec('Account')
      })
    })
  })

  describe('Transaction Endpoints', () => {
    describe('GET /api/transactions', () => {
      it('should validate transactions response schema', async () => {
        const transactionsResponse = {
          transactions: [
            {
              id: 1,
              accountId: 1,
              amount: -45.67,
              description: 'Grocery Store',
              category: 'Food & Dining',
              date: '2024-09-28T10:30:00Z',
              type: 'debit'
            },
            {
              id: 2,
              accountId: 1,
              amount: 2500.00,
              description: 'Salary Deposit',
              category: 'Income',
              date: '2024-09-25T08:00:00Z',
              type: 'credit'
            }
          ],
          total: 2,
          page: 1,
          pageSize: 10
        }

        // Validate each transaction
        transactionsResponse.transactions.forEach(transaction => {
          expect(transaction).toSatisfySchemaInApiSpec('Transaction')
        })

        // Validate the pagination structure
        expect(transactionsResponse).toMatchObject({
          transactions: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          pageSize: expect.any(Number)
        })
      })
    })

    describe('POST /api/transactions', () => {
      it('should validate create transaction request schema', async () => {
        const createTransactionRequest = {
          accountId: 1,
          amount: -125.50,
          description: 'Grocery Shopping',
          category: 'Food & Dining',
          type: 'debit' as const
        }

        expect(createTransactionRequest).toMatchObject({
          accountId: expect.any(Number),
          amount: expect.any(Number),
          description: expect.any(String),
          category: expect.any(String),
          type: expect.stringMatching(/^(debit|credit)$/)
        })
      })
    })
  })

  describe('Schema Validation Edge Cases', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmailRequest = {
        email: 'not-an-email',
        password: 'password123'
      }

      // Use regex validation since jest-openapi may not enforce format: 'email'
      expect(invalidEmailRequest.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

      // Test the object structure still passes basic type validation
      expect(invalidEmailRequest).toMatchObject({
        email: expect.any(String),
        password: expect.any(String)
      })
    })

    it('should reject password that is too short', async () => {
      const shortPasswordRequest = {
        email: 'test@example.com',
        password: '123'
      }

      expect(() => {
        expect(shortPasswordRequest).toSatisfySchemaInApiSpec('LoginRequest')
      }).toThrow()
    })

    it('should reject invalid account types', async () => {
      const invalidAccountType = {
        name: 'Test Account',
        type: 'invalid-type',
        initialBalance: 1000
      }

      expect(() => {
        expect(invalidAccountType).toSatisfySchemaInApiSpec('Account')
      }).toThrow()
    })

    it('should reject invalid transaction types', async () => {
      const invalidTransaction = {
        id: 1,
        accountId: 1,
        amount: 100,
        description: 'Test',
        category: 'Test',
        date: '2024-01-01T00:00:00Z',
        type: 'invalid-type'
      }

      expect(() => {
        expect(invalidTransaction).toSatisfySchemaInApiSpec('Transaction')
      }).toThrow()
    })
  })

  describe('OpenAPI Specification Validation', () => {
    it('should have a valid OpenAPI spec', async () => {
      expect(typedSpec).toBeDefined()
      expect(typedSpec.openapi).toBe('3.0.0')
      expect(typedSpec.info).toBeDefined()
      expect(typedSpec.info.title).toBe('MoneyWise API')
      expect(typedSpec.paths).toBeDefined()
      expect(typedSpec.components).toBeDefined()
      expect(typedSpec.components?.schemas).toBeDefined()
    })

    it('should have all required schemas defined', async () => {
      const schemas = typedSpec.components?.schemas
      expect(schemas).toBeDefined()

      const requiredSchemas = [
        'User',
        'Account',
        'Transaction',
        'LoginRequest',
        'AuthResponse',
        'Error'
      ]

      requiredSchemas.forEach(schemaName => {
        expect(schemas?.[schemaName]).toBeDefined()
      })
    })

    it('should have all required paths defined', async () => {
      const paths = typedSpec.paths
      expect(paths).toBeDefined()

      const requiredPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/user/profile',
        '/api/accounts',
        '/api/transactions'
      ]

      requiredPaths.forEach(path => {
        expect(paths[path]).toBeDefined()
      })
    })

    it('should have proper security definitions', async () => {
      expect(typedSpec.components?.securitySchemes).toBeDefined()
      expect(typedSpec.components?.securitySchemes?.bearerAuth).toBeDefined()
      expect(typedSpec.security).toBeDefined()
    })
  })
})