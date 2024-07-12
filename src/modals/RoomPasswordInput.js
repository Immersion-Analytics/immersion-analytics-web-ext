/**
 * This file defines a React component that renders a modal dialog for entering
 * a password to access a room. It integrates with the app object to handle password
 * submission and display messages based on room connection events.
 */

import {Form, Modal} from "react-bootstrap";
import {Button, TextField} from "@tableau/tableau-ui";
import {createRef, useState} from "react";

// RoomPasswordInput is a React component for handling password input for room access
export function RoomPasswordInput(props) {
    const { app } = props;

    const passwordRef = createRef();             // Create a reference to the password input field
    const [ show, setShow ] = useState();        // State variable to control the visibility of the modal
    const [ uri, setUri ] = useState();          // State variable to store the room URI
    const [ message, setMessage ] = useState();  // State variable to store the message details

    const handleSubmitPassword = e => {
        e.preventDefault();
        setShow(false);
        let password = passwordRef.current.value;
        app.provideRoomPassword(uri, password);
    }

    // Function to handle hiding the modal
    const handleHide = () => {
        setShow(false);
        app.disconnectRoom();   // Cancel connection attempt
    };

    // Event listener for app to request room password
    app.onRequestRoomPassword = (uri, msg) => {
        setShow(true);
        setUri(uri);
        setMessage(msg.details);
    };

    return (
        // Modal component to display password input form
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
