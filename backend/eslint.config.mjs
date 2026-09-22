import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Pragmatic baseline for an existing production codebase:
      // errors = real bugs (unused vars, undefined refs, bad syntax);
      // style debt stays as warnings so CI can enforce errors-only.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-case-declarations': 'off',
    },
  },
);
