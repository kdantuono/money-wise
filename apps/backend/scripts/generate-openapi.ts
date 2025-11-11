#!/usr/bin/env ts-node
/**
 * OpenAPI Specification Generator Script
 *
 * This script generates a static OpenAPI JSON specification from the NestJS application.
 * The generated spec is committed to version control for:
 * - API contract validation in CI/CD
 * - Breaking change detection in PRs
 * - Version-controlled API documentation
 *
 * Usage:
 *   pnpm docs:generate           # Generate openapi.json
 *   pnpm docs:generate --yaml    # Also generate openapi.yaml
 *
 * Output:
 *   docs/api/openapi.json        # Main OpenAPI 3.0 specification
 *   docs/api/openapi.yaml        # Optional YAML format
 *
 * References:
 *   - ADR-0004: NestJS Framework Selection
 *   - Remediation Plan Phase 4: Automation Layer
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

async function generateOpenAPI() {
  console.log('📄 Generating OpenAPI specification...\n');

  // Create NestJS application (headless, no HTTP server)
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Minimize output noise
  });

  const configService = app.get(ConfigService);
  const appConfig = {
    APP_NAME: configService.get<string>('APP_NAME', 'MoneyWise Backend'),
    APP_VERSION: configService.get<string>('APP_VERSION', '0.5.0'),
  };

  // Swagger configuration (matching main.ts)
  const config = new DocumentBuilder()
    .setTitle(appConfig.APP_NAME)
    .setDescription('MoneyWise Personal Finance Management API')
    .setVersion(appConfig.APP_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('Transactions', 'Transaction management')
    .addTag('Accounts', 'Account management')
    .addTag('Banking', 'Banking integration')
    .addTag('Budgets', 'Budget management')
    .addTag('Categories', 'Category management')
    .addServer('http://localhost:3001/api', 'Local Development')
    .addServer('https://api.moneywise.app/api', 'Production')
    .build();

  // Generate OpenAPI document
  const document = SwaggerModule.createDocument(app, config);

  // Ensure output directory exists
  const outputDir = path.resolve(__dirname, '../../../docs/api');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}`);
  }

  // Write JSON format (primary output)
  const jsonPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));
  console.log(`✅ Generated OpenAPI JSON: ${jsonPath}`);

  const stats = fs.statSync(jsonPath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

  // Optionally write YAML format
  if (process.argv.includes('--yaml')) {
    const yamlPath = path.join(outputDir, 'openapi.yaml');
    const yamlContent = yaml.dump(document, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
    fs.writeFileSync(yamlPath, yamlContent);
    console.log(`✅ Generated OpenAPI YAML: ${yamlPath}`);

    const yamlStats = fs.statSync(yamlPath);
    console.log(`   Size: ${(yamlStats.size / 1024).toFixed(2)} KB`);
  }

  // Extract statistics
  const paths = Object.keys(document.paths || {});
  const tags = document.tags?.map((t) => t.name) || [];

  console.log('\n📊 OpenAPI Specification Statistics:');
  console.log(`   Endpoints: ${paths.length}`);
  console.log(`   Tags: ${tags.length} (${tags.join(', ')})`);
  console.log(`   Version: ${document.info.version}`);
  console.log(`   OpenAPI: ${document.openapi}`);

  // Validation checks
  console.log('\n🔍 Validation Checks:');

  // Check for endpoints without tags
  const untaggedEndpoints = paths.filter((path) => {
    const methods = Object.keys(document.paths[path]);
    return methods.some((method) => {
      if (method === 'parameters') return false;
      const operation = document.paths[path][method];
      return !operation.tags || operation.tags.length === 0;
    });
  });

  if (untaggedEndpoints.length > 0) {
    console.log(`   ⚠️  ${untaggedEndpoints.length} endpoints without tags:`);
    untaggedEndpoints.forEach((endpoint) => console.log(`      - ${endpoint}`));
  } else {
    console.log('   ✅ All endpoints have tags');
  }

  // Check for endpoints without descriptions
  let endpointsWithoutDesc = 0;
  paths.forEach((path) => {
    const methods = Object.keys(document.paths[path]);
    methods.forEach((method) => {
      if (method === 'parameters') return;
      const operation = document.paths[path][method];
      if (!operation.description && !operation.summary) {
        endpointsWithoutDesc++;
      }
    });
  });

  if (endpointsWithoutDesc > 0) {
    console.log(`   ⚠️  ${endpointsWithoutDesc} endpoints without descriptions`);
    console.log('      Consider adding @ApiOperation() decorators');
  } else {
    console.log('   ✅ All endpoints have descriptions');
  }

  await app.close();

  console.log('\n✨ OpenAPI generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Review generated spec: docs/api/openapi.json');
  console.log('  2. Validate with: npx swagger-cli validate docs/api/openapi.json');
  console.log('  3. Add missing @Api* decorators to controllers');
  console.log('  4. Commit to version control\n');
}

// Execute generator
generateOpenAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ OpenAPI generation failed:', error);
    process.exit(1);
  });
