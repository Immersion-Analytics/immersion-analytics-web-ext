import {Image} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {
    AiFillEye, AiFillEyeInvisible,
    GiSunglasses,
    ImPlus,
    IoCloseCircle,
    IoMdRefresh,
    MdCastConnected,
    MdDelete
} from "react-icons/all";
import {Button, TextField} from "@tableau/tableau-ui";
import {usePropertyValue} from "../lib";
import {version} from "../../package.json";

const {IA} = window;

export function ZeroWidthSpace() {
    return (<span>&#8203;</span>);
}


export function useConnectionState(ia, onChanged) {
    function getCompleteConnectionState() {
        const state = ia.connectionStateMessage;
        state.id = ia.connectionState;
        return state;
    }

    const [connectionState, setConnectionState] = useState(getCompleteConnectionState());
    useEffect(() => {
        // Note: returned function unbinds onStateChanged() listener on effect cleanup
        return ia.onStateChanged(() => {
            const state = getCompleteConnectionState();
            setConnectionState(state);
            if (onChanged)
                onChanged(state);
        });
    })
    return connectionState;
}

export function useRoomInfo(ia) {
    const [roomInfo, setRoomInfo] = useState(ia.room)
    useEffect(() => {
        return ia.onRoomChanged(room => {
            setRoomInfo(room);
        })
    });
    return roomInfo;
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
        <span style={{color:IA.util.iaColorToCSS(connectionState.color)}} {...otherProps}>
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

export const EyeIcon = props => {
    const {on} = props;
    return on
        ? <AiFillEye className='eye-icon' />
        : <AiFillEyeInvisible className='eye-icon text-muted' />
}

export function IconButton(props) {
    let {icon, className, ...otherProps} = props;
    className = "icon-btn " + (className ?? '');
    return <Button className={className} {...otherProps}>
        {React.createElement(icon)}
    </Button>
}

export function ReconnectLobbyButton(props) {
    const {app} = props;
    return (
        <IconButton
                icon={RefreshIcon}
                onClick={() => app.reconnectToLobby()}
                {...props} />
    );
}

export function DisconnectLobbyButton(props) {
    const {app} = props;
    return (
        <IconButton
            icon={DeleteIcon}
            onClick={() => app.disconnectLobby()}
            {...props} />
    );
}

export function ExtensionVersion(props) {
    const {platform} = props;
    return (<span className='mx-1 app-version'>| {platform} v{version}</span>)

}

export function PropertyBoundTextField(props) {
    const {propertyGetter, validate} = props;

    const propertyValue = usePropertyValue(propertyGetter, '');
    const [fieldValue, setFieldValue] = useState(propertyValue);

    // While field is focused, input onChange() sets value,
    // Otherwise, value is pulled from the bound property
    const [focused, setFocused] = useState();

    if (!focused && fieldValue !== propertyValue)
        setFieldValue(propertyValue);

    const getValidationError = value => validate ? validate(value) : undefined;

    const validationError = getValidationError(fieldValue);
    const valid = validationError === undefined ? undefined : false;
    let message = validationError ?? '\u200b'; // zero width space

    const handleInputChanged = e => {
        const inputValue = e.target.value;
        setFieldValue(inputValue);
        if (!getValidationError(inputValue))
            propertyGetter()?.set(inputValue);
    }

    return (
        <TextField value={fieldValue}
                   onChange={handleInputChanged}
                   onFocus={() => setFocused(true)}
                   onBlur={() => setFocused(false)}
                   valid={valid}
                   message={message}
                   // onBlur={setFieldValue(propertyValue)}
                   kind='line'
        />
    );
}


