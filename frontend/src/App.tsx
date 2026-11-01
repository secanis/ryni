import { lazy, Show, type ParentProps } from 'solid-js';
import { Router, Route, Navigate } from '@solidjs/router';
import { auth } from '~/stores/auth';

const Login = lazy(() => import('~/pages/Login'));
const Setup = lazy(() => import('~/pages/Setup'));
const Sites = lazy(() => import('~/pages/Sites'));
const SiteNew = lazy(() => import('~/pages/SiteNew'));
const Dashboard = lazy(() => import('~/pages/Dashboard'));
const AdminUsers = lazy(() => import('~/pages/admin/Users'));
const AdminOidc = lazy(() => import('~/pages/admin/Oidc'));
const Shell = lazy(() => import('~/components/layout/Shell'));

function RequireAuth(props: ParentProps) {
  return (
    <Show when={auth.ready()} fallback={<div class="p-8 text-slate-500">Loading…</div>}>
      <Show when={auth.isAuthenticated()} fallback={<Navigate href="/login" />}>
        <Shell>{props.children}</Shell>
      </Show>
    </Show>
  );
}

export default function App() {
  return (
    <Router>
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />
      <Route path="/" component={RequireAuth}>
        <Route path="/" component={Sites} />
        <Route path="/sites/new" component={SiteNew} />
        <Route path="/sites/:id" component={Dashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/oidc" component={AdminOidc} />
      </Route>
    </Router>
  );
}
