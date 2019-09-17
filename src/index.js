import React from 'react';
import PropTypes from 'prop-types';

const IFRAME_INITIAL_SIZE = 550;

class IframeResizer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            height: IFRAME_INITIAL_SIZE,
        };
        this.receiveMessage = this.receiveMessage.bind(this);
    }

    componentDidMount() {
        window.addEventListener('message', this.receiveMessage, false);
    }

    componentWillUnmount() {
        window.removeEventListener('message', this.receiveMessage, false);
    }

    receiveMessage(event) {
        const { url } = this.props;

        if (url.startsWith(event.origin)) {
            const eventData = event.data;
            if (eventData && eventData.height && Number.isInteger(eventData.height)) {
                this.setState({
                    height: eventData.height,
                });
            }
        }
    }

    render() {
        const { url } = this.props;
        const style = { height: this.state.height, overflow: 'hidden', scrolling: 'no' };

        return (
            <div className='embed-responsive' style={style}>
                <iframe
                    className='embed-responsive-item'
                    src={url}
                    style={{ minHeight: '100%' }} />
            </div>

        );
    }

}

IframeResizer.defaultProps = {
    url: '',
};

IframeResizer.propTypes = {
    url: PropTypes.string.isRequired,
};

export default IframeResizer;
