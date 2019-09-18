import React from 'react';
import { render } from 'react-dom';

import IframeResizer from '../src/index';

const DemoApp = () => (
    <div style={{ margin: 'auto', width: '50%' }}>
        <h1>{'iFrame resizer demo site!!!!'}</h1>
        <IframeResizer url={'http://localhost:8081'}/>
    </div>
);

const root = document.createElement('div');

document.querySelector('body').appendChild(root);

render(<DemoApp/>, root);
