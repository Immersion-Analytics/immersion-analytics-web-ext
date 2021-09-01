import {Image} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {
    GiSunglasses,
    ImPlus,
    IoCloseCircle,
    IoMdRefresh,
    MdCastConnected,
    MdDelete
} from "react-icons/all";
import {Button} from "@tableau/tableau-ui";

const {IA} = window;

export function ZeroWidthSpace() {
    return (<span>&#8203;</span>);
}

// export function Flex(props) {
//     let {className, vertical, ...otherProps} = props;
//     className += " d-flex";
//
//     if (vertical === undefined || vertical)
//         className += " flex-column";
//
//     return (
//         <div className={className} {...otherProps}>
//             {props.children}
//         </div>
//     );
// }

export function useConnectionState(ia) {
    function getCompleteConnectionState() {
        const state = ia.connectionStateMessage;
        state.id = ia.connectionState;
        return state;
    }

    const [connectionState, setConnectionState] = useState(getCompleteConnectionState());
    useEffect(() => {
        // Note: returned function unbinds onStateChanged() listener on effect cleanup
        return ia.onStateChanged(() => {
            setConnectionState(getCompleteConnectionState());
        });
    })
    return connectionState;
}

export function isJoiningOrJoinedRoom(connectionState) {
    const {id} = connectionState;
    return id === "JoiningRoom" || id === "JoinedRoom";
}

export function ConnectionStatus(props) {
    const {app, ...otherProps} = props;
    const connectionState = useConnectionState(app.ia);

    const label = 'label' in props ? <span>Connection Status:&nbsp;</span> : null;

    return (
        <span style={{color:IA.util.iacolor_to_css(connectionState.color)}} {...otherProps}>
            {label}
            <span>{connectionState.message}</span>
            <ZeroWidthSpace />
        </span>);
}

export function IALogo(props) {
    let {width} = props;
    if (width === undefined)
        width = 100;
    const height = width * (454.0 / 2048);
    return <Image src='./img/ia-logo-and-text.png' width={width} height={height} {...props} />
}

export const ConnectionIcon = () => <MdCastConnected className='connection-icon' />;
export const VisualizationsIcon = () => <GiSunglasses className='visualizations-icon' />;
export const RefreshIcon = () => <IoMdRefresh className='refresh-icon text-success' />;
export const AddIcon = () => <ImPlus className='add-icon text-success' />;
export const DeleteIcon = () => <IoCloseCircle className='delete-icon text-danger' />;
export const TrashIcon = () => <MdDelete className={'trash-icon'} />;

export function IconButton(props) {
    let {icon, className, ...otherProps} = props;
    className = "icon-btn " + (className ?? '');
    return <Button className={className} {...otherProps}>
        {React.createElement(icon)}
    </Button>
}

export function ReconnectButton(props) {
    const {app} = props;
    return (
        <IconButton
                icon={RefreshIcon}
                onClick={() => app.reconnectToLobby()}
                {...props} />
    );
}

