/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */


import React from 'react';
import {Button} from "@tableau/tableau-ui";

import {
    ConnectionIcon,
    ConnectionStatus,
    IALogo,
    RetryConnectionInfoButton,
    VisualizationsIcon
} from "./control-panel/components";
import {DialogModeHash} from "./lib";
import {RoomPasswordInput} from "./modals/RoomPasswordInput";


function IAOverviewDisplay(props) {
    const {app} = props;

    const showConfig = (panel) => {
        const dialogUrl = `${window.location.origin}/${app.platform.id}-${panel}${DialogModeHash}`;
        console.log("Opening IA dialog at " + dialogUrl);

        const dialogOptions = { width: 500, height: 500 };

        app.platform.openDialog(dialogUrl, dialogOptions);
    };

    return (
    <div className='d-flex flex-wrap align-items-center'>
        <IALogo className='mr-2'/>

        <Button className="mr-1 mt-1" density='high'
                onClick={() => showConfig('visualizations')}>

            <VisualizationsIcon /><span>&nbsp;Visualizations</span>
        </Button>
        <Button className='mr-1 mt-1' density='high'
                onClick={() => showConfig('connection')}>

            <ConnectionIcon /><span>&nbsp;Connect</span>
        </Button>
        {/*<RetryConnectionInfoButton app={app}/>*/}
        <ConnectionStatus app={app} className='mt-1 mx-2 flex-grow-1'/>
        {/*</div>*/}
            {/*    <Button className="icon-btn ia-show-console" data-target="#console-out-modal" data-toggle="modal">*/}
            {/*        <BsTerminal />*/}
            {/*    </Button>*/}
            {/*<span className="d-inline-block text-nowrap">Connection Status:</span>&nbsp;*/}
    </div>
    );
}

export default IAOverviewDisplay;