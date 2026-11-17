/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { auth } from './stores/auth';
import { applyTheme, themeStore } from './stores/theme';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './index.css';

// Apply the persisted theme before render so the initial paint uses the
// correct colors (no flash of the wrong theme on reload).
applyTheme(themeStore.mode);

auth.init();

render(() => <App />, document.getElementById('root')!);
