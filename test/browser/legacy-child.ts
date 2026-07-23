declare global {
    interface Window {
        parentIFrame?: {
            sendMessage: (data: unknown) => void;
        };
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
