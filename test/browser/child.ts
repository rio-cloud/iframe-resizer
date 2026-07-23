import child from '../../src/child/index.js';

if (new URLSearchParams(window.location.search).has('inPageLinks')) {
    const content = document.querySelector<HTMLElement>('#content');

    if (content) {
        content.style.height = 'auto';
        content.insertAdjacentHTML(
            'beforeend',
            `
                <nav aria-label="In-page link test">
                    <a href="#child-anchor">Jump to child target</a>
                    <a href="#parent-anchor">Jump to parent target</a>
                </nav>
                <div style="height: 420px"></div>
                <h2 id="child-anchor">Child anchor target</h2>
                <div style="height: 240px"></div>
            `
        );
    }
}

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
