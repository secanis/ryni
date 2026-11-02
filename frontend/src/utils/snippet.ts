import type { Snippets } from '~/types';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Short random tracking id (also the default endpoint slug). */
export function generateTrackingId(length = 8): string {
  let id = '';
  for (let i = 0; i < length; i++) id += CHARS[Math.floor(Math.random() * CHARS.length)];
  return id;
}

export interface SnippetInput {
  /** Rýni origin (e.g. https://ryni.example). */
  server: string;
  /** The site's tracking id. */
  site: string;
  detailed?: boolean;
}

export function buildSnippets(input: SnippetInput): Snippets {
  const server = input.server.replace(/\/+$/, '');
  const detailed = input.detailed ? ' data-ryni-detailed' : '';
  const variantA = `<script async src="${server}/ryni.js" data-ryni-server="${server}" data-ryni-site="${input.site}"${detailed}></script>`;
  const variantB = `<script async src="/ryni.js" data-ryni-site="${input.site}"${detailed}></script>`;
  const proxyNote = [
    'The proxy runs fully on your own origin, so adblockers see only same-origin requests.',
    '',
    '1. Serve the tracker on your site: copy ryni.js into your static assets, or proxy /ryni.js to ' + server + '.',
    '2. Forward the tracking endpoint (nginx example):',
    '',
    '    location /t/ {',
    '        proxy_pass ' + server + '/t/;',
    '        proxy_set_header Host ' + server.replace(/^https?:\/\//, '') + ';',
    '    }',
  ].join('\n');
  return { variantA, variantB, proxyNote };
}
