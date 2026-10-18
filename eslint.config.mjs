import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // API payloads are validated with zod at the boundary; `any` is tolerated in tests and loose JSON plumbing.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      // React Compiler advisories. The app does not use the compiler; syncing a local draft from
      // fetched data in an effect and reading Date.now() for display are intentional here.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/incompatible-library': 'warn',
    },
  },
  { ignores: ['legacy/**', '.next/**', 'node_modules/**', 'scripts/**', 'docs/**', 'storage/**', 'tests/tmp/**', 'next-env.d.ts', 'test-auth.js'] },
];

export default config;
