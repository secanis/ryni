import { Router, Route } from '@solidjs/router';

export default function App() {
  return (
    <Router>
      <Route
        path="/"
        component={() => <h1 class="p-8 text-2xl font-semibold">RÝNI</h1>}
      />
    </Router>
  );
}
