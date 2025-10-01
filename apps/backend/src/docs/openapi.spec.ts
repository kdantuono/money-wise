/**
 * OpenAPI Specification for MoneyWise API
 * TODO: Generate this from NestJS Swagger decorators automatically
 */
export const spec: any = {
  openapi: '3.0.0',
  info: {
    title: 'MoneyWise API',
    version: '1.0.0',
    description: 'Personal Finance Management API'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'User login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful login',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'User registration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                },
                required: ['email', 'password', 'firstName', 'lastName']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '409': { description: 'User already exists' }
        }
      }
    },
    '/api/user/profile': {
      get: {
        tags: ['user'],
        summary: 'Get user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/accounts': {
      get: {
        tags: ['accounts'],
        summary: 'List accounts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of accounts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Account' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['accounts'],
        summary: 'Create account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Account' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Account created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Account' }
              }
            }
          }
        }
      }
    },
    '/api/transactions': {
      get: {
        tags: ['transactions'],
        summary: 'List transactions',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'accountId',
            in: 'query',
            schema: { type: 'integer' }
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' }
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date' }
          }
        ],
        responses: {
          '200': {
            description: 'List of transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Transaction' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['transactions'],
        summary: 'Create transaction',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Transaction' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Transaction created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transaction' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        },
        required: ['email', 'password']
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' }
        },
        required: ['user', 'token']
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatar: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email', 'name', 'createdAt', 'updatedAt']
      },
      Account: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['checking', 'savings', 'credit', 'investment']
          },
          balance: { type: 'number', format: 'double' },
          currency: { type: 'string', default: 'USD' },
          isActive: { type: 'boolean', default: true }
        },
        required: ['id', 'name', 'type', 'balance']
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          accountId: { type: 'integer' },
          amount: { type: 'number', format: 'double' },
          type: {
            type: 'string',
            enum: ['credit', 'debit', 'transfer']
          },
          category: { type: 'string', nullable: true },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        },
        required: ['id', 'accountId', 'amount', 'type', 'date']
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['income', 'expense']
          },
          parentId: { type: 'integer', nullable: true }
        },
        required: ['id', 'name', 'type']
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' }
        },
        required: ['error', 'code']
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};
