import { For, Show } from 'solid-js';
import { Box, Calendar, Code, Globe, Hash, Info, Package } from 'lucide-solid';
import { auth } from '~/stores/auth';
import { REPOSITORY, buildInfo, commitUrl, formatBuildTime, shortCommit } from '~/utils/version';

// About page — project links, the build the browser is running, the OSS
// stack RÝNI is assembled from, and the privacy/licence footer.

type Dependency = {
  name: string;
  description: string;
  license: string;
  url: string;
  role: string;
};

// Curated list of the stack that matters to an operator reading this page;
// not every transitive dependency from package-lock.json.
const DEPENDENCIES: Dependency[] = [
  {
    name: 'PocketBase',
    description: 'Single-binary Go backend (auth, storage, admin UI)',
    license: 'MIT',
    url: 'https://pocketbase.io',
    role: 'Backend',
  },
  {
    name: 'SolidJS',
    description: 'Reactive UI framework with fine-grained reactivity',
    license: 'MIT',
    url: 'https://www.solidjs.com',
    role: 'Frontend',
  },
  {
    name: 'Solid Router',
    description: 'Routing for SolidJS single-page apps',
    license: 'MIT',
    url: 'https://github.com/solidjs/solid-router',
    role: 'Frontend',
  },
  {
    name: '@ark-ui/solid',
    description: 'Accessible, unstyled UI primitives',
    license: 'MIT',
    url: 'https://ark-ui.com',
    role: 'Frontend',
  },
  {
    name: 'lucide-solid',
    description: 'Icon set (SolidJS bindings)',
    license: 'ISC',
    url: 'https://lucide.dev',
    role: 'Frontend',
  },
  {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    license: 'MIT',
    url: 'https://tailwindcss.com',
    role: 'Styling',
  },
  {
    name: 'TypeScript',
    description: 'Static type checker (source is .tsx)',
    license: 'Apache-2.0',
    url: 'https://www.typescriptlang.org',
    role: 'Tooling',
  },
  {
    name: 'Vite',
    description: 'Frontend build tool and dev server',
    license: 'MIT',
    url: 'https://vite.dev',
    role: 'Tooling',
  },
  {
    name: 'Vitest',
    description: 'Unit-test runner (Vite-native)',
    license: 'MIT',
    url: 'https://vitest.dev',
    role: 'Tooling',
  },
  {
    name: 'Helm',
    description: 'Kubernetes chart packaging',
    license: 'Apache-2.0',
    url: 'https://helm.sh',
    role: 'Deployment',
  },
  {
    name: 'nginx',
    description: 'Static file server for the SPA',
    license: 'BSD-2-Clause',
    url: 'https://nginx.org',
    role: 'Deployment',
  },
];

const LINKS = [
  { label: 'Source code', value: 'github.com/secanis/ryni', url: REPOSITORY, icon: Code },
  { label: 'Website', value: 'ryni.secanis.ch', url: 'https://ryni.secanis.ch', icon: Globe },
  {
    label: 'Helm chart',
    value: 'artifacthub.io/packages/helm/ryni/ryni',
    url: 'https://artifacthub.io/packages/helm/ryni/ryni',
    icon: Package,
  },
  {
    label: 'Container images',
    value: 'hub.docker.com/r/secanis/ryni-frontend',
    url: 'https://hub.docker.com/r/secanis/ryni-frontend',
    icon: Box,
  },
];

const card = 'bg-surface border border-border radius-card p-5';

export default function About() {
  // Compile-time constants: read once, no signal needed.
  const info = buildInfo();
  const link = commitUrl(info.commit);

  return (
    <div class="space-y-6 max-w-3xl">
      <div class="flex items-center gap-3">
        <Info size={24} class="text-text" />
        <div>
          <h1 class="text-2xl font-semibold">About RÝNI</h1>
          <p class="text-sm text-muted">Privacy-preserving web analytics</p>
        </div>
      </div>

      <Show when={auth.isAuthenticated()}>
        <p class="text-sm text-muted">
          Signed in as {String(auth.user()?.email ?? 'unknown user')}
        </p>
      </Show>

      <section class={card}>
        <h2 class="text-base font-medium mb-4">Project</h2>
        <ul class="space-y-3">
          <For each={LINKS}>
            {(l) => (
              <li>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-3 text-muted hover:text-text"
                >
                  <l.icon size={18} />
                  <span class="flex-1">
                    <span class="font-medium">{l.label}</span>
                    <span class="ml-2 text-xs text-muted break-all">{l.value}</span>
                  </span>
                  <span class="text-muted">↗</span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class={card}>
        <h2 class="text-base font-medium mb-4">Build</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="flex items-center gap-2 text-muted">
            <Info size={14} /> Version
          </dt>
          <dd class="font-mono break-all text-text">{info.version}</dd>

          <dt class="flex items-center gap-2 text-muted">
            <Hash size={14} /> Commit
          </dt>
          <dd class="font-mono break-all text-text">
            <Show when={link} fallback={shortCommit(info.commit)}>
              <a href={link!} target="_blank" rel="noopener noreferrer" class="hover:underline">
                {shortCommit(info.commit)}
              </a>
            </Show>
          </dd>

          <dt class="flex items-center gap-2 text-muted">
            <Calendar size={14} /> Built
          </dt>
          <dd class="font-mono break-all text-text">
            {formatBuildTime(info.buildTime) || info.buildTime || 'unknown'}
          </dd>
        </dl>
      </section>

      <section class={card}>
        <h2 class="text-base font-medium mb-1">Built on</h2>
        <p class="text-xs text-muted mb-4">The stack RÝNI is assembled from.</p>
        <ul class="divide-y divide-border">
          <For each={DEPENDENCIES}>
            {(d) => (
              <li class="py-3 flex items-start gap-3">
                <span class="text-xs uppercase tracking-wide text-muted w-24 shrink-0 pt-0.5">
                  {d.role}
                </span>
                <div class="flex-1 min-w-0">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-text hover:underline"
                  >
                    {d.name}
                  </a>
                  <p class="text-sm text-muted">{d.description}</p>
                </div>
                <span class="text-xs font-mono text-muted shrink-0 pt-0.5">{d.license}</span>
              </li>
            )}
          </For>
        </ul>
      </section>

      <p class="text-xs text-muted text-center pt-2">
        RÝNI sets no cookies, honours Do Not Track and stores no IP addresses. Licensed under
        AGPL-3.0-or-later.
      </p>
    </div>
  );
}
