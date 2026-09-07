import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src/data/*.json'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, import: importPlugin },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Dropping fields by rest-destructuring is how the build narrows a Prediction
      // to the Game it ships; the omitted names are the point, not dead code.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Code flows one way: shared -> pages -> App. The two pages never see each other,
      // and nothing shared reaches forward into a page.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/pages/board', from: './src/pages/about' },
            { target: './src/pages/about', from: './src/pages/board' },
            {
              target: ['./src/components', './src/hooks', './src/lib', './src/data'],
              from: ['./src/pages'],
            },
          ],
        },
      ],

      // Keeps import blocks in the same order in every file.
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
);
