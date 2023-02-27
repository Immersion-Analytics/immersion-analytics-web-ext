import {Form, Modal} from "react-bootstrap";
import {Button, TextField} from "@tableau/tableau-ui";
import {createRef, useState} from "react";

export function RoomPasswordInput(props) {
    const { app } = props;

    const passwordRef = createRef();
    const [ show, setShow ] = useState();
    const [ uri, setUri ] = useState();
    const [ message, setMessage ] = useState();

    const handleSubmitPassword = e => {
        e.preventDefault();
        setShow(false);
        let password = passwordRef.current.value;
        app.provideRoomPassword(uri, password);
    }

    const handleHide = () => {
        setShow(false);
        app.disconnectRoom();   // Cancel connection attempt
    };

    app.onRequestRoomPassword = (uri, msg) => {
        setShow(true);
        setUri(uri);
        setMessage(msg.details);
    };

    return (
        <Modal id='pw-input-modal' show={show} onHide={handleHide} autoFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>Enter Password</Modal.Title>
                {/*<span className='pw-msg'>{message}</span>*/}
            </Modal.Header>

            <Modal.Body>
                <Form inline onSubmit={handleSubmitPassword}>
                    <Form.Label>
                        {message}
                        :
                        <Form.Control className='ml-1 pw-input'
                                      type='password'
                                      size='sm'
                                      ref={passwordRef}
                                      autoFocus={true} />
                    </Form.Label>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={handleSubmitPassword}>Submit</Button>
            </Modal.Footer>
        </Modal>
    );
}
