import React from "react";
import {Container, Row, Col, Table, Dropdown, DropdownButton} from "react-bootstrap";
import {Button, TextField} from "@tableau/tableau-ui";
import {ReconnectButton, useConnectionState, isJoiningOrJoinedRoom} from "./components";

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
                        <td>Address</td>
                        <td className="d-flex align-items-center">
                            <TextField className="ia-server-address text-input-with-dropdown" kind='line'
                                       onChange={handleServerAddressInput}
                                       ref={serverAddressRef} />
                            <DropdownButton className="text-input-with-dropdown" title='' onSelect={handleServerAddressSelect}>
                                <Dropdown.Item eventKey='ws://localhost:11701'>Local Visualizer App</Dropdown.Item>
                                <Dropdown.Item eventKey='ws://localhost:11700'>Local Runtime Server</Dropdown.Item>
                            </DropdownButton>
                            <ReconnectButton className='ml-2' app={app} />
                        </td>
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


// noinspection BadExpressionStatementJS
//     <div className="modal fade" role="dialog" tabIndex="-1" id="ia-connect-modal">
//         <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
//         <div className="modal-content">
//             <div className="modal-header">
//                 <h4 className="modal-title">Connection</h4>
//                 <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span
//                     aria-hidden="true">×</span></button>
//             </div>
//             <div className="modal-body">
//                 <div className="table-responsive">
//                     <table className="table">
//                         <thead>
//                         <tr>
//                             <th colSpan="2">Runtime Server</th>
//                         </tr>
//                         </thead>
//                         <tbody>
//                         <tr>
//                             <td>Address/Url</td>
//                             <td className="d-flex align-items-center">
//                                 <input type="text" className="ia-server-address">
//                                     <div className="dropdown text-input-with-dropdown" id="ia-server-select">
//                                         <button className="btn btn-primary dropdown-toggle" aria-expanded="false"
//                                                 data-toggle="dropdown" type="button"></button>
//                                         <div className="dropdown-menu">
//                                             <a className="dropdown-item" href="#">ws://localhost:11700</a>
//                                             <a className="dropdown-item" href="#">ws://localhost:11701</a>
//                                         </div>
//                                     </div>
//                                     <button className="btn btn-primary refresh-btn icon-btn ia-reconnect-btn ml-2"
//                                             type="button"><i className="icon ion-refresh"></i></button>
//                             </td>
//                         </tr>
//                         <tr className="connected-row">
//                             <td></td>
//                             <!--                                    <td><span>Server Status:&nbsp;</span><span class="ia-lobby-status-value">&lt;Status Text&gt;&nbsp;</span></td>-->
//                         </tr>
//                         </tbody>
//                     </table>
//                 </div>
//                 <div className="table-responsive room-settings">
//                     <table className="table">
//                         <thead>
//                         <tr>
//                             <th colSpan="2">Collaboration Room</th>
//                         </tr>
//                         </thead>
//                         <tbody>
//                         <tr>
//                             <td>Room Name</td>
//                             <td><input type="text" className="ia-room-name"></td>
//                         </tr>
//                         <tr>
//                             <td>Room Password (optional)</td>
//                             <td id="ia-room-pw"><input type="password"></td>
//                         </tr>
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//             <div className="modal-footer d-flex justify-content-between">
//                 <div>
//                     <span>Connection Status:&nbsp;</span><span className="ia-connect-status-value"></span>
//                 </div>
//                 <div className="button-group">
//                     <button className="btn btn-light ia-connect-btn" type="button">Join or Create Room</button>
//                     <button className="btn btn-primary" type="button" data-dismiss="modal">Close</button>
//                 </div>
//             </div>
//         </div>
//     </div>
// </div>
