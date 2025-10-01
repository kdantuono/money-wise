/**
 * OpenAPI Specification
 * TODO: Generate this from NestJS Swagger decorators
 */
export const spec = {
  openapi: '3.0.0',
  info: {
    title: 'MoneyWise API',
    version: '1.0.0',
    description: 'Personal Finance Management API'
  },
  paths: {},
  components: {
    schemas: {
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        },
        required: ['email', 'password']
      }
    }
  }
};
