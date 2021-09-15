/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */
import {parseJSON} from "./lib";

const {confirm} = window;

export const IA_MAX_ROWS_TO_LOAD = 2000

export class IAExtensionController {
    constructor(platform, iaClient, errorCallback)
    {
        this.platform = platform;
        this.errorCallback = errorCallback;

        console.log("Initialize IA");

        this.ia = iaClient;
        this.scene = this.ia.scene;
        this.database = this.ia.scene.database;

        // TODO
        this.ia.onRoomPasswordRequired((uri, msg) => this._handleRoomPasswordRequired(uri, msg));


        // $('#pw-input-modal .btn-primary').click(e => this._submitRoomPassword());
    }

    saveConnectionInfo() {
        const info = JSON.stringify({
            lobby: {
                server: this.ia.lobbyServerUri
            },
            room: {
                server: this.ia.roomServerUri,
                name: this.ia.room?.name
            },
        });

        console.log("Save connection info: " + info);

        this.platform.saveSettings({"ia-connection-info": info});
    }

    handleSettingsChanged(settings) {
        console.log("Handling settings changed");
        const connectionInfo = settings["ia-connection-info"];
        if (connectionInfo)
            this._tryConnectionInfo(connectionInfo);
    }

    _tryConnectionInfo(infoStr) {
        const info = parseJSON(infoStr);
        if (!info) {
            console.log("Could not read connection info: " + infoStr);
        }
        console.log("Trying connection info");

        const lobbyServer = info.lobby?.server;
        if (lobbyServer && lobbyServer !== this.ia.lobbyServerUri) {
            this.ia.reconnectToLobby(lobbyServer);
        }

        const roomServer = info.room?.server;
        if (roomServer && roomServer !== this.ia.roomServerUri) {
            this.ia.connectToRoom(roomServer, info.room.password);
        }
    }

    _handleError(actionSubject, error) {
        const message = `Error ${actionSubject}`;
        console.error(message, error);
        if (this.errorCallback)
            this.errorCallback(message, error);
    }

    /** Reconnect to the IA Runtime Lobby Server URI entered in the server address input */
    reconnectToLobby(address)
    {
        // let address = this._serverAddressInput.val();
        if (address)
            this._serverAddress = address;

        console.log("Reconnect to lobby: " + this._serverAddress);


        /* If this URI is a collab Room server rather than Lobby server,
        * the IA runtime API will detect that and reconnect to it as
        * a room server
        */
        try {
            this.ia.connectToLobbyServer(this._serverAddress);
        } catch (e) {
            this._handleError("connecting to lobby server", e);
        }
    }


    /** If the room we are trying to join requires a password, display a
     * popup dialog allowing the user to enter the password.
     */
    _handleRoomPasswordRequired(uri, msg) {
        this._lastRoomPasswordUri = uri;
        this._passwordModal.find(".pw-msg").text(msg.details);
        this._passwordModal.modal();
    }

    /** Send room password entered in the room password dialog to the IA Runtime API */
    // _submitRoomPassword() {
    //     let pw = $('#pw-input-modal pw-input').val();
    //     this.ia.provideRoomPassword(this._lastRoomPasswordUri, pw);
    //     this._passwordModal.modal('hide');
    // }



    /** Create an IA table for `dataSrc` and set it as the data source
     * for the currently selected visualization
     * @param dataSrc
     *     name: Displayed name
     *     type: data source type ('tableau' for Tableau worksheet Logical Tables)
     *     logicalTableId: Tableau logical table ID
     *
     */
    setCurrentVisualizationDataSource(dataSrc) {
        console.log("Set Data Source: " + dataSrc.name);
        let viz = this.getSelectedViz();
        if (!viz)
            return;

        viz.axes.sourceDataset = dataSrc.name;
        this.platform.createTableForDataSource(dataSrc);
    }

    /** Select a Visualization by name.
     * Also selects this Visualization in the IA Runtime Scene.
     */
    selectViz(vizName) {
        const viz = this.scene.visualizations.getKey(vizName);
        if (viz)        // TODO 8/31/21 fix Runtime SetProperty() for null model value
            this.scene.focusedViz = viz;
    }

    /** Shortcut to retrieve the selected Visualizations from the internally stored name reference */
    getSelectedViz() {
        return this.scene.focusedViz;
    }

    /** Refresh data in the  Axis=>Variable mappings table */
    _updateMappings(viz, fullRefresh) {
        if (!viz)
        {
            this._axisMappingsTable.clear().draw();
            return;
        }

        let primaryAxes = viz.axes;

        let axes = fullRefresh
            ? primaryAxes.config.axes
            : this._axisMappingsTable.rows().data();

        for (let i=0; i<axes.length; i++)
        {
            let axis = axes[i];
            let mapping = primaryAxes.getMapping(axis.name);
            axis.enabled = mapping ? mapping.enabled : false;
            axis.mapping = mapping ? mapping.variableName : "";
        }

        this._axisMappingsTable
            .clear()
            .rows.add(axes)
            .draw();
    }


    getSelectedDataset() {
        let result = {}
        let viz = result.viz = this.getSelectedViz();
        if (viz)
        {
            let db = this.ia.scene.database;
            result.dataset = db.get(viz.axes.sourceDataset);
            result.secondaryDataset = db.get(viz.secondaryAxes.sourceDataset);
        }
        return result;
    }


    /** Create a new IA Visualization with default settings */
    newViz() {
        console.log("Create new visualization");
        let vizName = this._getUniqueVisualizationName();
        let viz = this.ia.create.ScatterViz(vizName);
        this.scene.visualizations.add(viz);
        this.selectViz(vizName);
    }

    /** Removes the selected viz from the scene */
    removeSelectedViz() {
        let viz = this.scene.focusedViz;
        if (!viz)
            return;
        console.log("Remove visualization: " + viz.name);
        this.scene.visualizations.remove(viz);
    }

    /** Find the next available default name for a new Visualization */
    _getUniqueVisualizationName() {
        let vizs = this.ia.scene.visualizations;

        let baseName = "New Visualization";
        if (!vizs.containsKey(baseName))
            return baseName;

        baseName = baseName + " ";

        for (let i=1; i<1000; i++)
        {
            let name = baseName + i;
            if (!vizs.containsKey(name))
                return name;
        }
        throw "Too many visualizations";
    }

    confirmResetScene() {
        if (confirm("Are you sure you would like to clear this scene and all of its existing visualizations?"))
            this.ia.syncEngine.reset();
    }
}

export default IAExtensionController;