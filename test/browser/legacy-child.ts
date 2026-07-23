declare global {
    interface Window {
        parentIFrame?: {
            sendMessage: (data: unknown) => void;
        };
    }
}

if (new URLSearchParams(window.location.search).has('inPageLinks')) {
    const content = document.querySelector<HTMLElement>('#content');
    const inPageLinks = document.querySelector<HTMLElement>('#in-page-links');

    if (content && inPageLinks) {
        content.style.height = 'auto';
        inPageLinks.hidden = false;
    }
}

document.querySelector('#grow')?.addEventListener('click', () => {
    const content = document.querySelector<HTMLElement>('#content');
    if (content) {
        content.style.height = '420px';
    }
});

document.querySelector('#message')?.addEventListener('click', () => {
    window.parentIFrame?.sendMessage({ status: 'legacy-received' });
});

export {};
