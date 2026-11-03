import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { mdsvex, type MdsvexOptions } from 'mdsvex';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';

/**
 * mdsvex 0.12.x emits `<script context="module">` for frontmatter.
 * Svelte 5 prefers `<script module>`; no stable mdsvex option yet
 * (1.0 / PR #773). Rewrite output before the Svelte compiler runs.
 */
function mdsvexSvelte5(options?: MdsvexOptions) {
	const processor = mdsvex(options);
	return {
		name: 'mdsvex-svelte5',
		async markup(args: { content: string; filename?: string }) {
			const result = await processor.markup(args);
			if (!result?.code) return result;
			return {
				...result,
				code: result.code.replace(
					/<script(\s[^>]*?)?\scontext=(["'])module\2/g,
					'<script$1 module'
				)
			};
		}
	};
}

export default defineConfig({
	server: {
		port: 4001,
		strictPort: true
	},
	preview: {
		port: 4001,
		strictPort: true
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			adapter: adapter(),
			preprocess: [mdsvexSvelte5({ extensions: ['.svx', '.md'] })],
			extensions: ['.svelte', '.svx', '.md'],
			experimental: { remoteFunctions: true }
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Cookie for SSR (hooks middleware); localStorage so the preference is
			// visible in browser storage and survives when cookies are restricted.
			strategy: ['cookie', 'localStorage', 'baseLocale']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
