import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.mjs', '*.js', 'scripts/*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { boundaries, import: importPlugin },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain/**' },
        { type: 'application', pattern: 'src/modules/*/application/**' },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'presentation', pattern: 'src/modules/*/presentation/**' },
        { type: 'contracts', pattern: 'src/contracts/**' },
        { type: 'composition', pattern: 'src/composition/**' },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'components', pattern: 'src/components/**' },
        { type: 'app', pattern: 'src/app/**' },
      ],
      'boundaries/include': ['src/**/*.ts', 'src/**/*.tsx'],
    },
    rules: {
      'import/no-cycle': ['error', { maxDepth: Infinity }],

      // Interface-first: no `type` alias on an object shape, no enums.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'No enums. Use a frozen const object plus a derived union.',
        },
        {
          selector: 'TSNonNullExpression',
          message: 'No non-null assertions. Narrow the type instead.',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],

      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain'] },
            { from: 'application', allow: ['domain', 'application', 'contracts'] },
            {
              from: 'infrastructure',
              allow: ['domain', 'application', 'infrastructure', 'contracts', 'lib'],
            },
            {
              from: 'presentation',
              allow: ['application', 'presentation', 'contracts', 'lib', 'components', 'domain'],
            },
            { from: 'composition', allow: ['*'] },
            { from: 'app', allow: ['presentation', 'composition', 'contracts', 'lib', 'components'] },
            { from: 'components', allow: ['components', 'contracts', 'lib'] },
            { from: 'lib', allow: ['lib', 'contracts'] },
            { from: 'contracts', allow: ['contracts'] },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'vitest.config.ts', 'eslint.config.mjs'],
    rules: { 'boundaries/element-types': 'off' },
  },
  prettier,
);
