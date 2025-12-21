import { mount } from 'svelte'
import App from '@/App.svelte'
import { checkBrowserSupport, showUnsupportedBrowserMessage } from '@/utils/browser-check'

if (!checkBrowserSupport()) {
	showUnsupportedBrowserMessage();
	throw new Error('Unsupported browser');
}

const app = mount(App, {
	target: document.getElementById('app')!,
})

export default app
