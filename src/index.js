import * as React from 'react';
import * as PropTypes from 'prop-types';

const iFrameInitialSize = 550;

class IframeResizer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            height: iFrameInitialSize,
        };
        this.receiveMessage = this.receiveMessage.bind(this);
    }

    componentDidMount() {
        window.addEventListener('message', this.receiveMessage, false);
    }

    componentWillUnmount() {
        window.removeEventListener('message', this.receiveMessage, false);
    }

    receiveMessage(e) {
        if (e.origin === this.props.url) {
            if (e.data && e.data.height && Number.isInteger(e.data.height)) {
                this.setState({
                    height: e.data.height,
                });
            }
        }
    }

    render() {
        const { url } = this.props;
        return (
            <div className='embed-responsive' style={ { height: this.state.height, overflow: 'hidden', scrolling: 'no' } }>
                <iframe
                    className='embed-responsive-item'
                    src={ url }
                    style={ { minHeight: '100%' } }/>
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
