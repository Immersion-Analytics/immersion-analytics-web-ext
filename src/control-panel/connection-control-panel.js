import React from "react";
import {Container, Row, Col, Table, Dropdown, DropdownButton} from "react-bootstrap";
import {Button, TextField} from "@tableau/tableau-ui";
import {ReconnectButton, useConnectionState, isJoiningOrJoinedRoom, ZeroWidthSpace} from "./components";

function ConnectionControlPanel(props) {
    const { app } = props;

    const connectionState = useConnectionState(app.ia);
    const joiningOrJoinedRoom = isJoiningOrJoinedRoom(connectionState);
    const disableConnectButton = ["Disconnected", "ConnectingToLobby", "Disconnecting"].includes(connectionState.id);


    const serverAddressRef = React.createRef();
    /** Handle user selecting an IA room or lobby server */
    const handleServerAddressSelect = address => {
        serverAddressRef.current.value = address;
        app.reconnectToLobby(address);
    };

    const handleServerAddressInput = e => {
        app.reconnectToLobby(e.target.value);
    };

    const roomNameRef = React.createRef();
    const handleJoinRoomButton = e => app.ia.joinOrCreateRoom(roomNameRef.current.value);

    return (
        <Container id="ia-connect-panel">

            {/* Runtime Server Settings */}
            <Table borderless>
                <thead>
                <tr>
                    <th colSpan="2">Runtime Server</th>
                </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Lobby Address</td>
                        <td className="d-flex align-items-center">
                            <TextField className="ia-server-address text-input-with-dropdown" kind='line'
                                       onChange={handleServerAddressInput}
                                       ref={serverAddressRef}
                                       value={ app.ia.lobbyServerUri ?? '' } />

                            <DropdownButton className="text-input-with-dropdown" title='' onSelect={handleServerAddressSelect}>
                                <Dropdown.Item eventKey='ws://localhost:11701'>Local Visualizer App</Dropdown.Item>
                                <Dropdown.Item eventKey='ws://localhost:11700'>Local Runtime Server</Dropdown.Item>
                            </DropdownButton>
                            <ReconnectButton className='ml-2' app={app} />
                        </td>
                    </tr>
                    <tr className=''>
                        <td className={ app.ia.roomServerUri ? '' : 'text-muted'}>Room Address</td>
                        <td>{ app.ia.roomServerUri ?? ''}</td>
                    </tr>
                    <tr className="connected-row">
                        <td></td>
                        {/*<td><span>Server Status:&nbsp;</span><span class="ia-lobby-status-value">&lt;Status Text&gt;&nbsp;</span></td>*/}
                    </tr>
                </tbody>
            </Table>

            {/*Room Settings*/}
            <fieldset disabled={joiningOrJoinedRoom}>
            <Table className="room-settings" borderless>
                <thead>
                    <tr>
                        <th colSpan="2">Collaboration Room</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Room Name</td>
                        <td><TextField className="ia-room-name" kind='line' ref={roomNameRef} /></td>
                    </tr>
                    <tr>
                        <td>Room Password (optional)</td>
                        <td><TextField type="password" id="ia-room-pw"/></td>
                    </tr>
                </tbody>
            </Table>
            </fieldset>

            <Container fluid>
                <Row >
                    <Col >
                    </Col>
                    <Col className='d-flex flex-row-reverse'> {/* Right align buttons when row wraps */}
                        <Button density='high'
                                onClick={ joiningOrJoinedRoom ? () => app.ia.disconnect() : handleJoinRoomButton }
                                disabled={disableConnectButton}>
                            { joiningOrJoinedRoom ? "Disconnect From Room" : "Join or Create Room" }
                        </Button>
                        {/*<button className="btn btn-primary" type="button" data-dismiss="modal">Close</button>*/}
                    </Col>
                </Row>
            </Container>
        </Container>
);
}

export default ConnectionControlPanel;


