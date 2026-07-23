type LegacyIframe = HTMLIFrameElement & {
    iFrameResizer?: {
        sendMessage: (data: unknown) => void;
    };
};

declare global {
    interface Window {
        iFrameResize: (
            options: {
                checkOrigin: boolean;
                inPageLinks?: boolean;
                onInit: () => void;
                onMessage: (event: { message: unknown }) => void;
            },
            iframe: HTMLIFrameElement
        ) => void;
        legacyParentState: {
            message: unknown;
            ready: boolean;
        };
        sendLegacyParentMessage: (data: unknown) => boolean;
    }
}

const iframe = document.querySelector<LegacyIframe>('#legacy-parent-frame');
if (!iframe) {
    throw new Error('Legacy parent iframe is missing');
}

window.legacyParentState = {
    message: undefined,
    ready: false,
};

window.sendLegacyParentMessage = data => {
    if (!iframe.iFrameResizer) {
        return false;
    }

    iframe.iFrameResizer.sendMessage(data);
    return true;
};

window.iFrameResize(
    {
        checkOrigin: true,
        inPageLinks: new URLSearchParams(window.location.search).has('inPageLinks'),
        onInit: () => {
            window.legacyParentState.ready = true;
        },
        onMessage: ({ message }) => {
            window.legacyParentState.message = message;
        },
    },
    iframe
);

export {};
