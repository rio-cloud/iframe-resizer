/* eslint-disable */
/* eslint-disable function-paren-newline */
import IframeResizer from '../../../src/index.js';
import renderer from 'react-test-renderer';
import React from 'react';
import {configure, mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-15';

configure({adapter: new Adapter()});

describe('IframeResizer', () => {

    const minProps = {
        url: 'some-url',
    };

    it('renders an iframe with some url', () => {
        const component = renderer.create(<IframeResizer {...minProps} />);
        const json = component.toJSON();
        expect(json).toMatchSnapshot();
    });

    it('renders an iframe with no url', () => {
        const component = renderer.create(<IframeResizer/>);
        const json = component.toJSON();
        expect(json).toMatchSnapshot();
    });

    it('calls the receiver callback function when an event is received', () => {

        const wrapper = mount(<IframeResizer {...minProps} />);
        const spy = jest.spyOn(wrapper.instance(), 'receiveMessage');

        window.addEventListener('message', spy, false);
        window.dispatchEvent(new Event('message'));

        expect(spy).toHaveBeenCalled();

    });

    it('resizes iframe to the height received when height is valid', () => {

        const wrapperHt = 100;
        const map = {};
        window.addEventListener = jest.fn((event, cb) => {
            map[event] = cb;
        });

        const wrapper = mount(<IframeResizer {...minProps}/>);

        // simulate event
        map.message({origin: minProps.url, data: {height: wrapperHt}});

        expect(wrapper.state('height')).toEqual(wrapperHt);

    });

    it('does not resize iframe to the height received when height is invalid', () => {

        const wrapperHt = undefined;
        const map = {};
        window.addEventListener = jest.fn((event, cb) => {
            map[event] = cb;
        });

        const wrapper = mount(<IframeResizer {...minProps}/>);

        // simulate event with height undefined
        map.message({origin: minProps.url, data: {height: wrapperHt}});

        expect(wrapper.state('height')).toEqual(550);

    });

    it('resizes iframe to its initialize height when height is not received', () => {

        const map = {};
        window.addEventListener = jest.fn((event, cb) => {
            map[event] = cb;
        });

        const wrapper = mount(<IframeResizer {...minProps}/>);

        // simulate event to be sent without the height
        map.message({origin: minProps.url, data: {someOtherKey: "someOtherValue"}});

        expect(wrapper.state('height')).toEqual(550);

    });

});
