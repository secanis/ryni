/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { auth } from './stores/auth';
import { applyTheme, themeStore } from './stores/theme';
import './index.css';

// Apply the persisted theme before render so the initial paint uses the
// correct colors (no flash of the wrong theme on reload).
applyTheme(themeStore.mode);

auth.init();

render(() => <App />, document.getElementById('root')!);
