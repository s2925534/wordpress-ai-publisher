import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/.next/**', '**/node_modules/**', '**/coverage/**', '**/dist/**']
  },
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {}
  }
];
