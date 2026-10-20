import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginUnicorn from 'eslint-plugin-unicorn'
import { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from 'eslint-config-prettier/flat'
import pluginNoComments from 'eslint-plugin-no-comments'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '.claude/worktrees/**', '.claude/skills/**', '.agents/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommendedTypeChecked,
  {
    name: 'app/vue-overrides',
    rules: {
      'vue/no-undef-components': 'error',
    },
  },

  pluginUnicorn.configs.recommended,
  {
    name: 'app/unicorn-overrides',
    rules: {
      // Vue SFCs use PascalCase filenames by convention; this rule can't be
      // configured to accept both PascalCase and kebab-case.
      'unicorn/filename-case': 'off',
    },
  },
  {
    name: 'app/unicorn-config-overrides',
    files: ['*.config.ts'],
    rules: {
      // Config files commonly nest helper calls (mergeConfig/defineConfig/
      // fileURLToPath(new URL(...))) as unavoidable boilerplate.
      'unicorn/max-nested-calls': 'off',
    },
  },
  {
    name: 'app/storage-stub',
    files: ['vitest.setup.ts'],
    rules: { 'unicorn/no-null': 'off' },
  },
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  {
    ...sonarjsConfigs.recommended,
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  {
    name: 'app/format-numbers',
    files: ['src/**/*.{vue,ts,mts,tsx}'],
    ignores: ['src/**/__tests__/**'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: false }],
    },
  },
  {
    name: 'app/no-comments',
    files: ['src/**/*.{vue,ts,mts,tsx}'],
    plugins: { 'no-comments': pluginNoComments },
    rules: { 'no-comments/disallowComments': ['error', { allow: ['global', 'eslint', 'oxlint'] }] },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
