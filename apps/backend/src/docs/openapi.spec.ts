import swaggerJSDoc from 'swagger-jsdoc'
import { OpenAPIV3 } from 'openapi-types'

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MoneyWise API',
      version: '1.0.0',
      description: 'Personal Finance Management API',
      contact: {
        name: 'MoneyWise Team',
        email: 'api@moneywise.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.moneywise.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name'],
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe'
            },
            avatar: {
              type: 'string',
              nullable: true,
              description: 'User avatar URL',
              example: 'https://example.com/avatar.jpg'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        Account: {
          type: 'object',
          required: ['id', 'name', 'type', 'balance', 'currency', 'isActive'],
          properties: {
            id: {
              type: 'integer',
              description: 'Account ID',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Account name',
              example: 'Checking Account'
            },
            type: {
              type: 'string',
              enum: ['checking', 'savings', 'credit', 'investment'],
              description: 'Account type',
              example: 'checking'
            },
            balance: {
              type: 'number',
              format: 'decimal',
              description: 'Account balance',
              example: 2500.00
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              example: 'USD'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether account is active',
              example: true
            }
          }
        },
        Transaction: {
          type: 'object',
          required: ['id', 'accountId', 'amount', 'description', 'category', 'date', 'type'],
          properties: {
            id: {
              type: 'integer',
              description: 'Transaction ID',
              example: 1
            },
            accountId: {
              type: 'integer',
              description: 'Associated account ID',
              example: 1
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Transaction amount (negative for debits)',
              example: -45.67
            },
            description: {
              type: 'string',
              description: 'Transaction description',
              example: 'Grocery Store'
            },
            category: {
              type: 'string',
              description: 'Transaction category',
              example: 'Food & Dining'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction date',
              example: '2024-09-28T10:30:00Z'
            },
            type: {
              type: 'string',
              enum: ['debit', 'credit'],
              description: 'Transaction type',
              example: 'debit'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password',
              example: 'password123'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          required: ['user', 'token'],
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            token: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid credentials'
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'AUTH_INVALID'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user with email and password',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful login',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AuthResponse'
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'User registration',
          description: 'Register a new user account',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email'
                    },
                    password: {
                      type: 'string',
                      minLength: 6
                    },
                    name: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful registration',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AuthResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/user/profile': {
        get: {
          tags: ['User'],
          summary: 'Get user profile',
          description: 'Retrieve current user profile',
          responses: {
            '200': {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      },
      '/api/accounts': {
        get: {
          tags: ['Accounts'],
          summary: 'Get user accounts',
          description: 'Retrieve all accounts for the authenticated user',
          responses: {
            '200': {
              description: 'List of accounts',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Account'
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Accounts'],
          summary: 'Create account',
          description: 'Create a new account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type'],
                  properties: {
                    name: {
                      type: 'string'
                    },
                    type: {
                      type: 'string',
                      enum: ['checking', 'savings', 'credit', 'investment']
                    },
                    initialBalance: {
                      type: 'number',
                      format: 'decimal'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Created account',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Account'
                  }
                }
              }
            }
          }
        }
      },
      '/api/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'Get transactions',
          description: 'Retrieve transactions with optional filtering',
          parameters: [
            {
              name: 'accountId',
              in: 'query',
              description: 'Filter by account ID',
              schema: {
                type: 'integer'
              }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of transactions to return',
              schema: {
                type: 'integer',
                default: 10
              }
            }
          ],
          responses: {
            '200': {
              description: 'Paginated transactions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transactions: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Transaction'
                        }
                      },
                      total: {
                        type: 'integer'
                      },
                      page: {
                        type: 'integer'
                      },
                      pageSize: {
                        type: 'integer'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } as OpenAPIV3.Document,
  apis: [] // We'll define the spec programmatically
}

export const spec = swaggerJSDoc(options) as OpenAPIV3.Document
export default spec