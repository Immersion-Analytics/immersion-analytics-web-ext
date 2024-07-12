/**
 * ©2023 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens 2 or Meta Quest from a Tableau dashboard
 *
 * @author Aaron Moffatt
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

const {IA} = window;

// Map platform IDs to their respective constructors
const platformConstructors = {
    [IAWebPlatformId] : () => new IAWebPlatform(),
    [IATableauPlatformId] : () => new IATableauPlatform(),
}

// IDs for different panels
const OverviewPanelId = 'overview';
const ConnectionPanelId = 'connection';
const VisualizationsPanelId = 'visualizations';

// Map panel IDs to their respective React components
const panelConstructors = {
    [OverviewPanelId] : props => <IAOverviewDisplay {...props} />,
    [ConnectionPanelId] : props => <IAControlPanel panelId='connection' {...props} />,
    [VisualizationsPanelId] : props => <IAControlPanel panelId='visualizations' {...props} />
}

/**
 * Custom hook to get platform and panel information from the URL.
 * 
 * This hook uses the `useLocation` hook from `react-router-dom` to access the current URL
 * and extract information about the platform and panel being accessed.
 * This information is encoded in the URL path.
 *
 * For example, a URL path like `/web-connection` will be parsed to extract:
 * - platformId: "web"
 * - panelId: "connection"
 * 
 * The extracted information can then be used to determine which platform and panel
 * components should be rendered in the application.
 * 
 * @returns {Object} An object containing `platformId` and `panelId`.
 */
function useLocationInfo() {
    const location = useLocation(); // Get the current location object
    const path = location.pathname;

    // Note: currently the Blazor WebAssembly may only be invoked from the root directory,
    // so we have to pack all location info into the first level path segment
    const segments = path.split('/');
    if (segments.length < 2)
        return {};

    const segment = segments[1];
    const components = segment.split('-');
    const count = components.length;

    // Return an object with `platformId` and `panelId` extracted from the components
    return {
        platformId : count > 0 ? components[0] : undefined,
        panelId : count > 1 ? components[1] : undefined,
    }
}

/**
 * The App component serves as the main entry point for the Immersion Analytics Tableau Dashboard Extension.
 * It handles the initialization of the platform and application controller, manages the state of the IA client,
 * and controls the rendering of different panels based on the URL path.
 * 
 * Key functionalities include:
 * - Initializing the IA Runtime client.
 * - Setting up the appropriate platform (Web or Tableau) based on the URL.
 * - Managing the loading state of the platform.
 * - Handling settings changes and connection state changes.
 * - Rendering the correct panel component based on the URL path.
 * 
 * This component uses React hooks such as useState and useEffect to manage state and side effects,
 * and the react-router-dom library to handle routing and URL path extraction.
 */
function App() {
    // State to hold the IA client instance
    const [iaClient, setIAClient] = useState();
    // State to hold the application controller instance
    const [appController, setAppController] = useState();
    // State to track if the platform is still loading
    const [isPlatformLoading, setIsPlatformLoading] = useState(true);
    
    const history = useHistory();                    // Hook to interact with the browser history
    let { platformId, panelId } = useLocationInfo(); // Destructure platformId and panelId from the URL location

    const platformConstructor = platformConstructors[platformId];

    if (!panelId)
        panelId = ConnectionPanelId;

    console.log("Refreshing IA Web Extension UI");

    /**
     * Initialize the platform and set up the application controller
     */
    const initPlatform = () => {

        if (!platformConstructor)
        {
            console.error("Unknown platform: " + platformId);
            return;
        }

        const platform = platformConstructor();

        // Create a new IAExtensionController instance with the platform and global IA client
        const app = new IAExtensionController(platform, window.ia);
        setAppController(app);

        // Initialize the platform with the IA client and set up callbacks
        platform.init(window.ia, {
            // Callback for when the platform is initialized
            onInitialized: () => {
                console.log(`Platform ${platformId} ready`);
                setIsPlatformLoading(false)
            },

            // Callback for when settings change
            onSettingsChanged: settings => {
              app.handleSettingsChanged(settings);
            }
        });
    };


    // Ensure IA Runtime client is initialized
    useEffect(() => {
        return IA.onReady(() => {
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


    const handleConnectionStateChanged = stateId => {
        if (stateId === "ConnectedToLobby" || stateId === "JoinedRoom")
            appController.saveConnectionInfo();
    }

    useEffect(() => {
        if (appController)
            return appController.ia.onStateChanged(handleConnectionStateChanged);
    })

    // Once the IA Scene synchronization between XR device and web browser is initialized this method will be called
    const handleRoomConnectionReady = () => {
        console.log("Room connection is ready!");
    }

    useEffect(() => {
        if (appController)
            return appController.ia.onSyncReady(handleRoomConnectionReady);
    });


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

export default App;
