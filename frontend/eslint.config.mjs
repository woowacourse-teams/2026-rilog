import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import checkFile from 'eslint-plugin-check-file';
import tseslint from 'typescript-eslint';

const nextComponentFiles = ['src/**/{page,layout,template,default,loading,error,global-error,not-found}.tsx'];

const componentDefinitionRules = {
	'import/no-anonymous-default-export': 'error',
	'react/function-component-definition': [
		'error',
		{
			namedComponents: 'function-declaration',
		},
	],
};

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		plugins: {
			'check-file': checkFile,
		},
		rules: {
			'check-file/filename-naming-convention': [
				'error',
				{
					'**/*.{js,ts,mjs,cjs}': 'KEBAB_CASE',
					'**/*.{jsx,tsx}': 'PASCAL_CASE',
				},
				{
					ignoreMiddleExtensions: true,
				},
			],
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'type', 'internal', 'parent', 'sibling', 'index', 'object'],
					pathGroups: [
						{
							pattern: '@/{app,widgets,features,domains,shared,test}/**',
							group: 'internal',
							position: 'before',
						},
					],
					pathGroupsExcludedImportTypes: ['builtin'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		extends: [...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports',
				},
			],
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variable',
					format: ['camelCase', 'UPPER_CASE'],
					leadingUnderscore: 'allow',
				},
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase'],
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
				},
				{
					selector: 'parameter',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
				},
				{
					selector: 'typeParameter',
					format: ['PascalCase'],
					prefix: ['T'],
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-shadow': 'error',
			'id-denylist': ['error', 'foo', 'bar', 'baz', 'temp'],
		},
	},
	{
		files: nextComponentFiles,
		rules: {
			...componentDefinitionRules,
			'check-file/filename-naming-convention': [
				'error',
				{
					'**/*.{jsx,tsx}': 'KEBAB_CASE',
				},
				{
					ignoreMiddleExtensions: true,
				},
			],
		},
	},
	{
		files: ['src/**/*.tsx'],
		ignores: [...nextComponentFiles, 'src/**/*.component.test.tsx'],
		rules: {
			...componentDefinitionRules,
			'import/no-named-export': 'error',
		},
	},
	{
		files: ['src/**/*.ts'],
		rules: {
			'import/no-default-export': 'error',
		},
	},
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
	]),
	prettierConfig,
]);

export default eslintConfig;
