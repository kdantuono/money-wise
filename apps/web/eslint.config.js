// ESLint 9 Flat Config for MoneyWise Web (Next.js 15)
import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import a11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    // JS/Config files (Node env)
    {
        files: [
            '**/*.js',
            '**/*.cjs',
            '**/*.mjs',
            '**/*.jsx',
            'tailwind.config.js',
            'postcss.config.js',
            'eslint.config.js',
            '**/*.config.js',
        ],
        ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: {
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
        },
    },
    // Application TypeScript (browser env, type-aware)
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                React: 'readonly',
                fetch: 'readonly',
                performance: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                process: 'readonly',
                NodeJS: 'readonly',
                confirm: 'readonly',
                alert: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            next: nextPlugin,
            '@next/next': nextPlugin,
            'jsx-a11y': a11y,
            'react-hooks': reactHooks,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,
            ...nextPlugin.configs['core-web-vitals'].rules,
            ...reactHooks.configs.recommended.rules,
            // Soften strict TS rules for current codebase
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            'no-unused-vars': 'off',
            // Allow unused vars with underscore prefix
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            'react-hooks/exhaustive-deps': 'warn',
            // Disable new strict react-hooks v7 rules for now (existing patterns need refactoring)
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/purity': 'off',
        },
    },
    // Tests (Vitest/JSDOM, relaxed)
    {
        files: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'src/**/__tests__/**/*.{ts,tsx}',
            '__tests__/**/*.{ts,tsx}',
            'vitest.setup.ts',
        ],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                // Avoid type-aware parsing for tests to reduce noise
                project: null,
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                performance: 'readonly',
                global: 'readonly',
                NodeJS: 'readonly',
                confirm: 'readonly',
                alert: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            next: nextPlugin,
            '@next/next': nextPlugin,
            'jsx-a11y': a11y,
            'react-hooks': reactHooks,
        },
        rules: {
            ...js.configs.recommended.rules,
            // Relax strictness for tests
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            'react-hooks/exhaustive-deps': 'off',
        },
    },
]
