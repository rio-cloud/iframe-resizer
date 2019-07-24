[![Build Status](https://travis-ci.com/rio-cloud/iframe-resizer.svg?branch=master)](https://travis-ci.com/rio-cloud/iframe-resizer)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# iframe-resizer

## Purpose
This Iframe-Resizer wrapper is a react component which embeds an SPA in an Iframe. It responsively resizes the height of the Iframe and its displayed content. 
It can be used to render websites within an iFrame whose size changes dynamically.

### Current Features 
This container service currently covers the following features:
* IframeResizer gets height from SPA via PostMessage
* Responsive resizing 
* Unit-Tests 
* Integration testing

## Prerequisites
Your SPA needs to be able to send its height to the parent window via postMessage whenever it's size changes, and you will need to implement this 
 functionality yourself. ForExample:
   
```javascript
function onResize() {
    if (document.referrer) {
        const height = document.body.clientHeight;
        window.parent.postMessage({ height: height }, document.referrer);
    }
}
```
The IframeResizer will listen for these messages and behave accordingly.
If your SPA is also written in React, you would probably implement this in a ```componentDidUpdate()``` function.

## Usage
1.	In your parent, where you want to display the Iframe : Update your package.json and add the Iframe-Resizer to the dependencies: 
   
```     
"@rio-cloud/iframe-resizer": "0.0.1"
```     

2.	Execute npm install

3.	Add the <IframeResizer /> in your parentApplication.js with the URL of the SPA you want to display in it and add it to the rendering.
   
```javascript  
import IframeResizer from '@rio-cloud/iframe-resizer';

const myGreatApp = <IframeResizer url={"https://myToBeDisplayedSPA_URL/"}/>
```
## Local development and testing
To start the demo app locally, first run ```npm run start-demo``` then run ```npm run start``` in a separate terminal. 

## License
iframe-resizer is licensed under the [Apache 2.0 license](https://github.com/rio-cloud/iframe-resizer/blob/master/LICENSE).

