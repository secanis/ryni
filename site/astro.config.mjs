// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'RÝNI',
			customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/secanis/ryni' }],
			head: [
				{
					// Dark (Polar Night) is the default theme. Prime Starlight's
					// stored-theme key so a system that prefers light still lands
					// dark; an explicit user toggle to light is remembered.
					tag: 'script',
					content: `(() => {
						if (!localStorage.getItem('starlight-theme')) {
							localStorage.setItem('starlight-theme', 'dark');
							document.documentElement.dataset.theme = 'dark';
						}
					})();`,
				},
			],
			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
