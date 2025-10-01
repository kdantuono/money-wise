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
  paths: {},
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
            enum: ['income', 'expense', 'transfer']
          },
          category: { type: 'string', nullable: true },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
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
