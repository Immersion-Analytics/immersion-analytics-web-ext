/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */


import React, {useEffect, useState} from "react";
import {BrowserRouter as Router, Route, Switch, withRouter, useLocation, useHistory} from "react-router-dom";

import './styles.css';
import IAOverviewDisplay from "./IAOverviewDisplay";
import IAControlPanel from "./control-panel/IAControlPanel";
import LoadingSpinner from "./modals/LoadingSpinner";

import IAExtensionController from "./IAExtensionController";
import {IATableauPlatform, IATableauPlatformId} from "./platforms/tableau";
import {IAWebPlatform, IAWebPlatformId} from "./platforms/web";
import {NotFoundPage} from "./lib";
import {cleanup} from "@testing-library/react";

const {IA} = window;


const platformConstructors = {
    [IAWebPlatformId] : () => new IAWebPlatform(),
    [IATableauPlatformId] : () => new IATableauPlatform(),
}

const OverviewPanelId = 'overview';
const ConnectionPanelId = 'connection';
const VisualizationsPanelId = 'visualizations';

const panelConstructors = {
    [OverviewPanelId] : props => <IAOverviewDisplay {...props} />,
    [ConnectionPanelId] : props => <IAControlPanel panelId='connection' {...props} />,
    [VisualizationsPanelId] : props => <IAControlPanel panelId='visualizations' {...props} />
}


function useLocationInfo() {
    const location = useLocation();
    const path = location.pathname;

    // Note: currently the Blazor WebAssembly may only be invoked from the root directory,
    // so we have to pack all location info into the first level path segment
    const segments = path.split('/');
    if (segments.length < 2)
        return {};

    const segment = segments[1];
    const components = segment.split('-');
    const count = components.length;
    return {
        platformId : count > 0 ? components[0] : undefined,
        panelId : count > 1 ? components[1] : undefined,
    }
}

function App() {
    const [iaClient, setIAClient] = useState();
    const [appController, setAppController] = useState();

    const [isPlatformLoading, setIsPlatformLoading] = useState(true);
    const history = useHistory();
    let { platformId, panelId } = useLocationInfo();

    // const { platformName } = useParams();
    const platformConstructor = platformConstructors[platformId];

    if (!panelId)
        panelId = ConnectionPanelId;

    console.log("Updating IA Web Extension UI");

    const initPlatform = () => {

        if (!platformConstructor)
        {
            console.error("Unknown platform: " + platformId);
            return;
        }

        const platform = platformConstructor();

        const app = new IAExtensionController(platform, window.ia);
        setAppController(app);

        platform.init(window.ia, {
            onInitialized: () => {
                console.log(`Platform ${platformId} ready`);
                setIsPlatformLoading(false)
            },

            onSettingsChanged: settings => {
              app.handleSettingsChanged(settings);
            }
        });
    };


    // Ensure IA Runtime client is initialized
    useEffect(() => {
        IA.onReady(() => {
            if (iaClient)
                return; // already created

            console.log("IA ready");

            console.assert(!window.ia, "IA client has already been created. Invalid state.");

            // Define a global Immersion Analytics client instance for debugging purposes
            window.ia = IA.createClient();
            setIAClient(window.ia);

            initPlatform();
        });
    });

    // Once the IA Scene synchronization between XR device and web browser is initialized this method will be called
    const handleRoomConnectionReady = () => {
        console.log("Room connection is ready!");
        appController.saveConnectionInfo();
    }

    useEffect(() => {
        if (appController)
            return appController.ia.onSyncReady(handleRoomConnectionReady);
    })


    if (!platformConstructors[platformId])
    {
        // Default to web platform
        history.push('/' + IAWebPlatformId);
        return null;
    }

    if (isPlatformLoading)
        return <LoadingSpinner />;



    const panelProps = { app: appController, platformId: platformId }

    const panelConstructor = panelConstructors[panelId];
    if (!panelConstructor)
        return NotFoundPage("Panel");

    return panelConstructor(panelProps);


    // return (
    //     <Router>
    //         <Switch>
    //             {/*Currently platform is assumed to be tableau*/}
    //             <Route path='/:platformName/control-panel/:panel' component={IAControlPanel} />
    //             <Route path='/:platformName/control-panel' component={IAControlPanel} />
    //             <Route path='/:platformName/' component={IAOverviewDisplay} />
    //         </Switch>
    //     </Router>
    // );
}

export default (App);

// Used to notify panels that they are a opened as a sub-dialog of the application
// e.g. Used in Tableau platform to disable dataset binding management in dialogs
export const DialogModeHash = "#dialog";
