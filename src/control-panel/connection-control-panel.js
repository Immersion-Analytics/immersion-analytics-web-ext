import React, {useRef, useState} from "react";
import {Container, Row, Col, Table, Dropdown, DropdownButton, Modal, ToggleButton} from "react-bootstrap";
import {Button, TextField, Checkbox} from "@tableau/tableau-ui";
import {
    ReconnectLobbyButton,
    useConnectionState,
    isJoiningOrJoinedRoom,
    ZeroWidthSpace,
    ConnectionStatus, useRoomInfo
} from "./components";
import {FiEdit, IoGlobeOutline} from "react-icons/all";

function ConnectionControlPanel(props) {
    const { app } = props;

    const connectionState = useConnectionState(app.ia);
    const joiningOrJoinedRoom = isJoiningOrJoinedRoom(connectionState);
    const disableConnectButton = ["Disconnected", "ConnectingToLobby", "Disconnecting"].includes(connectionState.id);

    const [showAddressModal, setShowAddressModal] = useState();//connectionState.id == "Disconnected");

    const handleRecentAddressSelect = address => app.reconnectToLobby(address);

    const roomNameRef = React.createRef();
    const roomPasswordRef = React.createRef();
    const [viewerPasswordEnabled, setViewerPasswordEnabled] = useState();   // refs don't seem to work with Checkbox
    const viewerPasswordRef = React.createRef();
    const handleJoinRoomButton = e => app.ia.joinOrCreateRoom(
        roomNameRef.current.value,
        roomPasswordRef.current.value,
        viewerPasswordEnabled ? viewerPasswordRef.current.value : null
    );

    return (
        <Container id="ia-connect-panel">
            <ServerAddressModal app={app} show={showAddressModal} setShow={setShowAddressModal} />

            {/* Runtime Server Settings */}
            <Table borderless>
                <thead>
                <tr>
                    <th>Runtime Server</th>
                    <th className="d-flex align-items-center justify-content-end">
                        <Button kind='outline' density='high'
                                onClick={() => setShowAddressModal(true)}>
                            <IoGlobeOutline />
                            {/*<FiEdit />*/}
                            &nbsp;
                            Set Server Address
                        </Button>

                        <RecentServerSelect app={app} onSelect={handleRecentAddressSelect} />
                        <ReconnectLobbyButton className='ml-2' app={app} />
                    </th>
                </tr>
                </thead>
                <tbody>
                    <tr className={ app.ia.lobbyServerUri ? '' : 'text-muted'}>
                        <td>Lobby Address</td>
                        <td>{ app.ia.lobbyServerUri ?? 'Not Connected'}</td>
                    </tr>
                </tbody>
            </Table>

            {/*Room Settings*/}
            <fieldset disabled={joiningOrJoinedRoom}>
            <Table className="room-settings fullwidth-inputs" borderless>
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
                        <td><TextField type="password" className='d-block' ref={roomPasswordRef}/></td>
                    </tr>
                    <tr>
                        <td>
                            <div className="d-flex align-items-center">
                                <span>Enable view-only access</span>
                                <Checkbox className="px-2 mb-0" checked={viewerPasswordEnabled} onChange={e => setViewerPasswordEnabled(e.target.checked)}/>
                            </div>
                        </td>
                        <td className={"d-flex align-items-center" + (viewerPasswordEnabled ? '' : ' text-muted')}>
                            <span className="mr-1">Viewer password</span>
                            <TextField type="password" className="flex-grow-1" ref={viewerPasswordRef} disabled={!viewerPasswordEnabled} />
                        </td>
                    </tr>
                </tbody>
            </Table>
            </fieldset>

            <div className="d-flex align-items-center">
                <span className={ 'flex-grow-1 ' + (app.ia.roomServerUri ? '' : 'text-muted')}>
                    <span className="d-inline-block">Room Address:</span>
                    <span className="px-2 d-inline-block">{ app.ia.roomServerUri ?? 'Not Connected'}</span>
                </span>
                <Button density='high'
                        className="flex-shrink-0"
                        onClick={ joiningOrJoinedRoom ? () => app.disconnectRoom() : handleJoinRoomButton }
                        disabled={disableConnectButton}>
                    { joiningOrJoinedRoom ? "Disconnect From Room" : "Join or Create Room" }
                </Button>
                    {/*<button className="btn btn-primary" type="button" data-dismiss="modal">Close</button>*/}
            </div>
        </Container>
);
}

export default ConnectionControlPanel;


function RecentServerSelect(props) {
    const {app, onSelect} = props;
    
    return (
        <DropdownButton className="text-input-with-dropdown"
                        title=''
                        onSelect={onSelect}>
            {
                app.getRecentServers().map(server => {
                    return (
                        <Dropdown.Item key={server.url} eventKey={server.url}>
                            {server.name}
                        </Dropdown.Item>
                    );
                })
            }
        </DropdownButton>
    );
}

function ServerAddressModal(props) {
    const {show, setShow, app} = props;
    const [address, setAddress] = useState(app.lastLobbyServerAddress);

    const handleAddressInput = e => setAddress(e.target.value);

    const handleDisconnect = e => app.disconnectLobby(true);
    const handleConnect = e => app.reconnectToLobby(address);

    const handleRecentAddressSelect = address => {
        setAddress(address);
    };

    const handleHide = () => setShow(false);

    // Auto close on successful connection
    const handleConnectionStateChanged = state => {
        if (["ConnectedToLobby", "JoinedRoom"].includes(state.id))
            setTimeout(handleHide, 500);
    }

    const connectionState = useConnectionState(app.ia, handleConnectionStateChanged);

    const showDisconnect = ["ConnectingToLobby", "ConnectedToLobby", "JoiningRoom", "JoinedRoom"].includes(connectionState.id);
    let actionButton = {
        onClick: showDisconnect ? handleDisconnect : handleConnect,
        content: showDisconnect ? "Disconnect" : "Connect"
    };

    return (
        <Modal show={show}
               onHide={handleHide} >
            <Modal.Header closeButton>
                <Modal.Title><h6>Enter Server Address</h6></Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex align-items-center fullwidth-inputs">
                <TextField className="text-input-with-dropdown flex-grow-1"
                           placeholder='ws://'
                           onChange={handleAddressInput}
                           value={address}
                />
                <RecentServerSelect app={app}
                                    onSelect={handleRecentAddressSelect}/>
            </Modal.Body>
            <Modal.Footer>
                <ConnectionStatus app={app} />
                <Button onClick={handleHide}>Close</Button>
                <Button onClick={actionButton.onClick} kind='primary'>{actionButton.content}</Button>
            </Modal.Footer>
        </Modal>
    );
}

