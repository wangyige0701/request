import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import del from 'rollup-plugin-delete';
import terser from '@rollup/plugin-terser';

const enteries = ['src/index.ts'];

const plugins = [
	resolve({
		rootDir: 'src',
		browser: true,
	}),
	typescript(),
	commonjs(),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
	...enteries.map(input => {
		/** @type {import('rollup').RollupOptions} */
		const config = {
			input,
			output: {
				name: '$API',
				file: 'dist/request.min.js',
				format: 'iife',
				globals: {
					util: 'util',
					stream: 'stream',
					path: 'path',
					http: 'http',
					https: 'https',
					url: 'url',
					fs: 'fs',
					assert: 'assert',
					tty: 'tty',
					zlib: 'zlib',
					events: 'events',
				},
			},
			external: ['util', 'stream', 'path', 'http', 'https', 'url', 'fs', 'assert', 'tty', 'zlib', 'events'],
			plugins: [
				del({ targets: ['dist/*'] }),
				...plugins,
				terser({
					module: false,
					compress: {
						ecma: 2015,
						pure_getters: true,
					},
					safari10: true,
				}),
			],
		};
		return config;
	}),
];
