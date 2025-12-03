// ESLint 9 flat config for apps/backend
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import security from 'eslint-plugin-security'
import noSecrets from 'eslint-plugin-no-secrets'

export default [
    {
        files: ['**/*.ts'],
        ignores: ['dist/**', 'generated/**', 'node_modules/**'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            security,
            'no-secrets': noSecrets
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-secrets/no-secrets': 'off',
            'security/detect-non-literal-regexp': 'off',
            'security/detect-non-literal-fs-filename': 'off'
        }
    }
]
