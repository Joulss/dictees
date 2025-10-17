// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importNewlines from 'eslint-plugin-import-newlines';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import stylistic from '@stylistic/eslint-plugin';


export default [
  // Ignorer les dossiers de build
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base JS
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion : 2022,
      sourceType  : 'module',
      globals     : { ...globals.node }
    }
  },

  // Règles communes (JS/TS)
  {
    plugins : { 'import-newlines': importNewlines },
    rules   : {
      'no-undef'                : 'off', // handled by TS
      'array-bracket-spacing'   : ['error', 'never'],
      'arrow-parens'            : ['error', 'as-needed'],
      'brace-style'             : ['error', '1tbs', { allowSingleLine: false }],
      'comma-dangle'            : ['error', 'never'],
      'comma-spacing'           : ['error', { before: false, after: true }],
      curly                     : ['error', 'all'],
      'import-newlines/enforce' : ['error', 1000, 1000000],
      indent                    : ['error', 2],
      'key-spacing'             : ['error', {
        multiLine : { beforeColon: false, afterColon: true },
        align     : { on: 'colon', beforeColon: true, afterColon: true }
      }],
      'no-multi-spaces': ['error', {
        exceptions: {
          Property             : true,
          ImportDeclaration    : true,
          AssignmentExpression : true,
          VariableDeclarator   : true
        }
      }],
      'no-unused-vars'              : ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      'no-var'                      : 'error',
      'object-property-newline'     : ['error', { allowAllPropertiesOnSameLine: true }],
      'prefer-const'                : 'error',
      // 'quote-props'                 : ['error', 'as-needed'],
      quotes                        : ['error', 'single'],
      semi                          : ['error', 'always'],
      'sort-imports'                : ['warn', { ignoreCase: true, ignoreDeclarationSort: true }],
      'space-before-blocks'         : ['error', 'always'],
      'space-before-function-paren' : ['error', 'never'],
      'space-infix-ops'             : 'error'
    }
  },

  // Spécifique TypeScript
  {
    files           : ['**/*.ts', '**/*.tsx'],
    languageOptions : {
      parser        : tsParser,
      parserOptions : {
        ecmaVersion : 2022,
        sourceType  : 'module'
        // Si tu utilises des "project rules", ajoute: project: ['./tsconfig.json']
      },
      globals: { ...globals.node }
    },
    plugins : { '@typescript-eslint': tsPlugin },
    rules   : {
      // On désactive la règle JS et on active celle TS pour les unused vars
      'no-unused-vars'                    : 'off',
      '@typescript-eslint/no-unused-vars' : ['error', {
        ignoreRestSiblings        : true,
        argsIgnorePattern         : '^_',
        varsIgnorePattern         : '^_',
        caughtErrorsIgnorePattern : '^_'
      }],

      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer                  : 'type-imports',
        disallowTypeAnnotations : false
      }],
      '@typescript-eslint/member-ordering'               : ['warn', { default: { order: 'natural-case-insensitive' } }],
      '@typescript-eslint/ban-ts-comment'                : 'off',
      '@typescript-eslint/no-empty-interface'            : 'off',
      '@typescript-eslint/no-non-null-assertion'         : 'off',
      '@typescript-eslint/no-explicit-any'               : 'off',
      '@typescript-eslint/explicit-function-return-type' : 'off'
    }
  },

  // --- Vue SFC (.vue) ---
  {
    files           : ['**/*.vue'],
    languageOptions : {
      parser        : vueParser,
      parserOptions : {
        ecmaVersion         : 2022,
        sourceType          : 'module',
        // Use TS inside <script> / <script setup>
        parser              : tsParser,
        extraFileExtensions : ['.vue']
      },
      // Le front Tauri est un WebView → APIs navigateur ok
      globals: { ...globals.browser }
    },
    plugins: {
      vue,
      '@stylistic': stylistic
    },
    rules: {
      // Tes règles demandées
      'vue/first-attribute-linebreak'    : ['error', { singleline: 'beside', multiline: 'beside' }],
      'vue/html-closing-bracket-newline' : ['error', { singleline: 'never', multiline: 'never' }],
      'vue/html-indent'                  : ['error', 2, {
        attribute                 : 1,
        baseIndent                : 1,
        closeBracket              : 0,
        alignAttributesVertically : true,
        ignores                   : []
      }],
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'never', component: 'always' }
      }],
      'vue/multiline-html-element-content-newline'  : 'off',
      'vue/require-default-prop'                    : 'off',
      'vue/script-indent'                           : ['error', 2, { baseIndent: 1 }],
      'vue/singleline-html-element-content-newline' : 'off',

      // Spécifique style TS dans .vue
      '@stylistic/type-annotation-spacing': 'error',

      // Désactive l’`indent` core pour laisser `vue/script-indent` gérer l’indent des <script>
      indent: 'off'
    }
  },

  // --- Optionnel: activer la règle stylistic aussi pour TS purs (.ts/.tsx) ---
  {
    files   : ['**/*.ts', '**/*.tsx'],
    plugins : { '@stylistic': stylistic },
    rules   : {
      '@stylistic/type-annotation-spacing': 'error'
    }
  }
];
