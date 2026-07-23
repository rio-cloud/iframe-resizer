import child from '../../src/child/index.js';

child?.subscribe(message => {
    const output = document.querySelector('#parent-message');
    if (output) {
        output.textContent = JSON.stringify(message);
    }
});

document.querySelector('#grow')?.addEventListener('click', () => {
    const content = document.querySelector<HTMLElement>('#content');
    if (content) {
        content.style.height = '420px';
    }
});

document.querySelector('#message')?.addEventListener('click', () => {
    child?.sendMessage({ status: 'received' });
});
