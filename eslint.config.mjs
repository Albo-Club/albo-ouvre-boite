import { defineConfig, globalIgnores } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import convexPlugin from '@convex-dev/eslint-plugin'

export default defineConfig([
  ...tanstackConfig,
  ...convexPlugin.configs.recommended,
  // `.agents/skills` holds upstream skill content vendored verbatim, including
  // illustrative .tsx examples that live outside any tsconfig project — linting
  // them only produces parser errors. Kept in sync with `.prettierignore`.
  globalIgnores([
    'convex/_generated',
    'prettier.config.js',
    '.output',
    '.nitro',
    'dist',
    '.agents/skills',
    '.claude/skills',
  ]),
  // shadcn/ui components are vendored from the shadcn CLI — we don't lint
  // their internal style (shadowed prop names, defensive nullish checks).
  {
    files: ['src/components/ui/**'],
    rules: {
      'no-shadow': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
])
