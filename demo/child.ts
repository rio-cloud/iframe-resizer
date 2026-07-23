import '../src/child/index.js';

const contentList = document.querySelector<HTMLElement>('#content-list');
const addButton = document.querySelector<HTMLButtonElement>('#add-content');
const removeButton = document.querySelector<HTMLButtonElement>('#remove-content');
let nextItem = 1;

const updateControls = () => {
    if (removeButton && contentList) {
        removeButton.disabled = contentList.childElementCount === 0;
    }
};

const addContent = () => {
    if (!contentList) {
        return;
    }

    const article = document.createElement('article');
    article.innerHTML = `
        <span>${String(nextItem).padStart(2, '0')}</span>
        <div>
            <h2>Additional child content</h2>
            <p>
                This block changes the document height. The child runtime observes the change and reports the new
                measurement to the React parent.
            </p>
        </div>
    `;
    contentList.append(article);
    nextItem += 1;
    updateControls();
};

addButton?.addEventListener('click', addContent);
removeButton?.addEventListener('click', () => {
    contentList?.lastElementChild?.remove();
    updateControls();
});

updateControls();
