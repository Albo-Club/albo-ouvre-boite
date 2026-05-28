import { defineConfig, globalIgnores } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import convexPlugin from '@convex-dev/eslint-plugin'

export default defineConfig([
  ...tanstackConfig,
  ...convexPlugin.configs.recommended,
  {
    // Vendored shadcn/ui primitives are kept byte-for-byte registry-aligned
    // (never hand-edited, so `pnpm dlx shadcn add` stays a clean overwrite), so
    // we don't hold their upstream code to the project's style / type-aware rules.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-shadow': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'import/consistent-type-specifier-style': 'off',
    },
  },
  globalIgnores([
    'convex/_generated',
    '.output',
    '.vercel',
    '.nitro',
    'dist',
    'prettier.config.js',
  ]),
])
