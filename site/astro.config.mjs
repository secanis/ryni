// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://ryni.secanis.ch/',
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
					label: 'Docs',
					items: [
						{ label: 'Overview', slug: 'docs' },
						{ label: 'Quick start', slug: 'docs/quickstart' },
						{ label: 'Tracking a website', slug: 'docs/tracking' },
						{ label: 'Configuration', slug: 'docs/configuration' },
						{ label: 'Helm', slug: 'docs/helm' },
						{ label: 'SSO & backups', slug: 'docs/sso-and-backups' },
						{ label: 'Development', slug: 'docs/development' },
					],
				},
			],
		}),
	],
});
