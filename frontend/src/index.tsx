/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { auth } from './stores/auth';
import './index.css';

auth.init();

render(() => <App />, document.getElementById('root')!);
