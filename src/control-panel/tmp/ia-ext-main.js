/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */

const IA_MAX_ROWS_TO_LOAD = 2000

class IAExt {
    constructor(integration)
    {
        let $this = this;       // for event callbacks
        this.integration = integration;

        console.log("Initialize IA");

        // Create a new Immersion Analytics (IA) Runtime API client
        this.ia = IA.createClient();
        this.scene = this.ia.scene;
        this.database = this.ia.scene.database;

        //================================================
        // Initialize IA Runtime event listeners
        //================================================
        this.ia.onStateChanged(state => this._handleStateChanged(state));
        this.ia.onRoomPasswordRequired((uri, msg) => this._handleRoomPasswordRequired(uri, msg));

        // Once the IA Scene synchronization between XR device and web browser is initialized this method will be called
        this.ia.onSyncReady(() => this._handleRoomConnectionReady());

        // Update this Visualization list when Viz's are added or removed
        this.scene.visualizations.onChanged(() => this._handleVizListChanged());
        // Listen for Viz selection changes coming from the headset
        this.scene.selection.onChanged(property => {
            let viz = property.get(0);
            if (viz)
                this.selectViz(viz.name);
        })

        //================================================
        // Connection parameters panel for the headset/collab server
        //================================================
        this._serverAddressInput = $('input.ia-server-address');
        this._serverAddressInput.change(() => this.reconnectToLobby());
        this._passwordModal = $('#pw-input-modal');
        
        $('.ia-reconnect-btn').click(() => this.reconnectToLobby());
        
        $('#ia-server-select .dropdown-item').click(e => this._handleServerSelectDropdown(e))
        
        this._connectBtn = $('.ia-connect-btn');
        this._connectBtn.click(e => this._handleConnectBtn());
        
        $('#pw-input-modal .btn-primary').click(e => this._submitRoomPassword());

        this._roomSettingsPanel = $('.room-settings');

        this._connectStatusText = $('.ia-connect-status-value');

        //================================================
        // Controls for selecting/adding/removing IA visualizations in the headset
        //================================================
        this._vizSelect = $('#ia-viz-select');
        this._vizSelect.find('button').click(e => this._updateVisualizationsSelect());
        
        this._newVizBtn = $('#ia-new-viz');
        this._newVizBtn.click(() => this.newViz());
        
        this._removeVizBtn = $('#ia-remove-viz');
        this._removeVizBtn.click(() => this.removeSelectedViz());

        $('button.ia-reset-scene').click(() => this.confirmResetScene());

        //================================================
        // Controls and info about the currently selected IA viz
        //================================================
        this._vizInfoSections = $(".ia-viz-info");

        // Set visualization name
        this._vizNameText = $('.ia-viz-name');
        this._vizNameInput = $('input.ia-viz-name');
        this._vizNameInput.change(() => this.setSelectedVizName(this._vizNameInput.val()));

        // Dropdown to select a datasource
        this._dataSourceSelect = $('#ia-datasource-select');
        this._dataSourceSelect.find('button').click(e => this._updateDataSourcesSelect());

        this._datasetRowCountText = $('.ia-dataset-row-count');
        this._datasetVariableCountText = $('.ia-dataset-var-count');

        this.database.onChanged(() => this._updateSelectedDatasetInfo());

        // The Axis=>Variable mappings table for configuring high-dimensional visualizations
        this._axisMappingsPanel = $('#ia-axis-mappings');
        this._axisMappingsTable = this._axisMappingsPanel.find('table')
            .DataTable({
                paging: false,
                ordering: false,
                info: false,
                columns: [
                    // {
                    //     data: 'enabled',
                    //     render: $this._getMappingEnabledCell
                    // },
                    {
                        data: 'name'
                    },
                    {
                        data: 'mapping',
                        render: function(data) {
                            return $this._getAxisMappingCell(data);
                        }
                    },
                ],
                language: {
                    emptyTable: "Please select a visualization"
                }
            });

        this._axisMappingsPanel.find('tbody')
            .on('click',
                '.dropdown.ia-axis-mapping button',
                e => {
                    let dropdown = $(e.target).parents('.dropdown');
                    var axis = $this._axisMappingsTable.row(dropdown.parents('tr')).data();
                    $this._updateVariableSelect(axis.name);
                });

        // Viz point size
        this._pointSizeSlider = $('input.ia-point-size')
            .on('input change', e => {
                let value = parseFloat($(e.target).val());
                if (isFinite(value))
                    $this.ia.scene.vizSettings.pointSize = value;
            })

        // Viz colormap
        this._colormapSelect = $('.dropdown.ia-viz-colormap');
        this._colormapSelect.find('button')
            .click(e => $this._updateColormapSelect());


        //When a change in the IA Scene is detected
        this.ia.scene.onChanged(e => {
            // Needed to update the point size slider
            // When the user changes point size from within the headset
            if (e.sourceModel.modelType == 'VizSettings') {
                $this._updateSelectedVizInfo();
            }
        });

        //================================================
        // Initialize the Tableau integration layer
        //================================================
        this.integration.init(this.ia);

        // Initialize the states of UI controls to <no visualization selected>
        this._updateSelectedVizInfo();
    }

    _recordScrollPosition(overrideExisting)
    {
        // If a scroll position is already pending restore, don't overwrite it unless asked to
        if (this._recordedScrollPosition && !overrideExisting)
            return;

        this._recordedScrollPosition = [window.scrollX, window.scrollY];
    }
    _restoreScrollPosition()
    {
        if (this._recordedScrollPosition)
        {
            window.scroll(...this._recordedScrollPosition);
            this._recordedScrollPosition = undefined;
        }
    }

    /** Reconnect to the IA Runtime Lobby Server URI entered in the server address input */
    reconnectToLobby()
    {
        console.log("Reconnect to lobby");
        
        let address = this._serverAddressInput.val();

        /* If this URI is a collab Room server rather than Lobby server,
        * the IA runtime API will detect that and reconnect to it as
        * a room server
        */
        this.ia.connectToLobbyServer(address);
    }

    /** Update connection-related UI components when the IA Runtime connection state changes
     * Disable room settings inputs if already connected to a room
     */
    _handleStateChanged(state) {
        let stateMessage = this.ia.connectionStateMessage;
        console.log("State changed: " + stateMessage.message);
        // console.log(statusMessage);
        this._connectStatusText.text(stateMessage.message);
        this._connectStatusText.css('color', IA.util.iacolor_to_css(stateMessage.color));

        let joiningOrJoinedRoom = this._isJoiningOrJoinedRoom();
        
        this._connectBtn.text(joiningOrJoinedRoom ? "Disconnect from Room" : "Create or Join Room");

        this._connectBtn.prop('disabled', state == "Disconnected" || state == "ConnectingToLobby" || state == "Disconnecting");

        this._roomSettingsPanel.find(':input').prop('disabled', joiningOrJoinedRoom);
        this._roomSettingsPanel.find('td').toggleClass('text-muted', joiningOrJoinedRoom);
    }
    
    _isJoiningOrJoinedRoom() {
        let state = this.ia.connectionState;
        return state == "JoiningRoom" || state == "JoinedRoom";
    }


    /** Create Room/Disconnect button logic */
    _handleConnectBtn() {
        if (this._isJoiningOrJoinedRoom())
            this.ia.disconnect();
        else
        {
            let roomName = $('input.ia-room-name').val();
            this.ia.joinOrCreateRoom(roomName);
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
    _submitRoomPassword() {
        let pw = $('#pw-input-modal pw-input').val();
        this.ia.provideRoomPassword(this._lastRoomPasswordUri, pw);
        this._passwordModal.modal('hide');
    }

    _handleRoomConnectionReady() {
        console.log("Room connection is ready!");
    }

    /** Update the dropdown menu of visualizations in the IA Runtime Scene */
    _updateVisualizationsSelect() {
        let $this = this;
        let menu = this._vizSelect.find('.dropdown-menu');
        menu.empty();

        this.ia.scene.visualizations.keys
            .forEach(function(name) {
                makeDropdownItem(name, () => $this.selectViz(name))
                    .appendTo(menu);
            });
    }

    /** Update the data sources dropdown menu with
     * [<Existing tables in the IA Scene.Database] and
     * [<Available Tableau Worksheet Logical Tables>]
     */
    _updateDataSourcesSelect() {
        let $this = this;
        let menu = this._dataSourceSelect.find('.dropdown-menu');
        menu.empty();
        menu.append($(`<h6 class='dropdown-header'>Active Data Sources:</h6>`));

        // cancel any previous operations retrieving the datasource list
        if (this._cancelToken)
            this._cancelToken.cancelled = true;
        let cancelToken = this._cancelToken = { cancelled : false }

        this.ia.scene.database.datasets.keys.forEach(datasetName => {
            let dataSrc = { name: datasetName };
            menu.append($this._getDataSourceMenuItem(dataSrc));
        });

        menu.append($(`<h6 class='dropdown-header'>Available Data Sources:</h6>`));


        this._pendingDataSources = this.integration.getDataSourcesAsync();

        // TODO add loading spinner while waiting

        this._pendingDataSources.then(dataSources => {
            if (cancelToken.cancelled)
                return;

            dataSources.forEach(dataSrc => {
                menu.append($this._getDataSourceMenuItem(dataSrc));
            });
        })
    }

    _getDataSourceMenuItem(dataSrc) {
        let $this = this;
        return makeDropdownItem(
                $('<span>').text(dataSrc.name).html(),
                e => $this.setCurrentVisualizationDataSource(dataSrc));
    }

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
        this.integration.createTableForDataSource(dataSrc);
    }

    /** Select a Visualization by name.
     * Also selects this Visualization in the IA Runtime Scene.
     */
    selectViz(vizName) {
        if (vizName == this._selectedVizName)
            return;

        if (this._unregisterSelectedVizListener)
            this._unregisterSelectedVizListener();
        
        this._selectedVizName = vizName;
        
        let viz = this.getSelectedViz();
        if (viz)
        {
            this._unregisterSelectedVizListener = viz.onChanged(e => this._updateSelectedVizInfo(false, e));

            // Update Scene selection to follow this selection
            this.ia.scene.selection.setSingleValue(viz);
        }
        this._updateSelectedVizInfo(true);
    }

    /** Shortcut to retrieve the selected Visualizations from the internally stored name reference */
    getSelectedViz() {
        return this.ia.scene.visualizations.getKey(this._selectedVizName);
    }

    /** Update UI displaying info for the selected IA Visualizations */
    _updateSelectedVizInfo(fullRefresh, event) {
        this._recordScrollPosition();

        let viz = this.getSelectedViz();
        let vizName = viz ? viz.name : '';
        let vizLabel = viz ? viz.name : '<No Visualization Selected>';
        console.log('Updating Info For Visualization: ' + vizLabel);

        // Disable form fields and labels
        this._vizInfoSections.find(':input').prop('disabled', !viz);
        this._vizInfoSections.toggleClass('text-muted', !viz);

        this._vizNameInput.val(vizName);
        this._vizNameText.text(vizLabel);    // Non-inputs should display a 'null' message
        
        let datasetName = viz ? viz.axes.sourceDataset : '';
        this._dataSourceSelect.find('button').text(datasetName ? datasetName : "<Select Data Source>");

        this._updateSelectedDatasetInfo();

        this._pointSizeSlider.val(this.ia.scene.vizSettings.pointSize);

        let colormapName = viz ? viz.colormapName : "<Colormap>";
        this._colormapSelect.find('button').text(colormapName)
        
        this._updateMappings(viz, fullRefresh);

        this._restoreScrollPosition();
    }

    _updateSelectedDatasetInfo() {
        let rows = '-';
        let variables = '-';

        let selected = this.getSelectedDataset();
        if (selected.dataset)
        {
            rows = selected.dataset.rowCount;
            if (rows == IA_MAX_ROWS_TO_LOAD)
                rows = "<span class='error-text'>" + rows + "</span> (Dataset Truncated)"
            variables = selected.dataset.variables.count;
        }

        this._datasetRowCountText.html(rows);
        this._datasetVariableCountText.html(variables);
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

    /** Create a toggle cell to enable/disable the current Axis=>Variable mapping */
    _getMappingEnabledCell(enabled) {
        let icon = enabled ? 'ion-eye' : 'ion-eye-disabled';
        return `<button class='enable-axis btn icon-btn'><i class='icon ${icon}'></i></button>`;
    }

    /** AxisMappings table:
     * Create a new cell for the 'Variable' column, displaying a
     * dropdown menu to select which variable this Axis displays.
     */
    _getAxisMappingCell(axisMapping) {
        return `<div class="dropdown ia-axis-mapping">
                    <button class="btn btn-block dropdown-toggle" aria-expanded="false" data-toggle="modal" data-target="#variable-select-modal" type="button">
                        ${axisMapping ? axisMapping : ""}
                    </button>
                </div>`;
        // <div className="dropdown-menu"></div>
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

    /** Update a dropdown menu of available data source columns/variables
     * based on the currently referenced table
     */
    _updateVariableSelect(axisName) {
        this._recordScrollPosition();

        let menu = $('#variable-select-modal').find('.modal-body');
        menu.empty();

        let selected = this.getSelectedDataset();

        makeDropdownItem('&lt;Unmapped&gt;', e => {
            selected.viz.clearMapping(axisName)
            this._closeVariableSelect();
        })
            .appendTo(menu);


        if (!selected.dataset)
            return;

        selected.dataset.variables.keys.forEach(variable => {
                makeDropdownItem(variable, () => {
                    selected.viz.mapAxis(axisName, variable)
                    this._closeVariableSelect();
                })
                    .appendTo(menu);
            });
    }

    _closeVariableSelect() {
        $("#variable-select-modal").modal('hide');
    }

    /** Update the dropdown menu of available colormaps */
    _updateColormapSelect() {
        let menu = this._colormapSelect.find('.dropdown-menu');
        menu.empty();

        let viz = this.getSelectedViz();
        if (!viz)
            return;

        this.ia.scene.colormaps.availableColormapNames
            .forEach(name => {
                makeDropdownItem(name, () => {
                        viz.colormapName = name;
                    })
                    .appendTo(menu);
            });
    }

    /** Create a new IA Visualization with default settings */
    newViz() {
        console.log("Create new visualization");
        let vizName = this._getUniqueVisualizationName();
        let viz = this.ia.create.ScatterViz(vizName);
        this.ia.scene.visualizations.add(viz);
        this.selectViz(viz.name);
    }

    /** Removes the selected viz from the scene */
    removeSelectedViz() {
        console.log("Remove visualization: " + this._selectedVizName);
        if (this._selectedVizName)
            this.ia.scene.visualizations.removeKey(this._selectedVizName);
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

    /** When the IA.Scene.Visualizations list changes,
     * select the first viz if none are currently selected
     */
    _handleVizListChanged() {
        let viz = this.getSelectedViz();
        if (viz)
            return;

        let vizs = this.ia.scene.visualizations;
        this.selectViz(vizs.keys[0]);  // select first visualization by default
    }

    /** Sets the Name property for the selected IA Visualization */
    setSelectedVizName(name) {
        if (!name)
            return;
        
        // Cancel if a plot already has this name
        if (this.ia.scene.visualizations.containsKey(name))
            return;
        
        let viz = this.getSelectedViz();
        if (viz)
        {
            viz.name = name;
            this._selectedVizName = name;
            console.log("Todo rename listener");
        }
    }

    confirmResetScene() {
        if (confirm("Are you sure you would like to clear this scene and all of its existing visualizations?"))
            this.ia.syncEngine.reset();
    }
}



/** Create a basic html dropdown menu item */
function makeDropdownItem(name, callback) {
    return $(`<a class='dropdown-item' href="#">${name}</a>`)
        .click(callback);
}



console.log("IA Extension");

// $(window).on('load', function() {
//
// });

/** Once the Immersion Analytics Runtime library is ready, init the extension logic */
$(function() {
    $('#loading-spinner-modal').modal('show');

    IA.onReady(() => {
        console.log("IA ready");
        $('#loading-spinner-modal').modal('hide');

        window.ia_ext = new IAExt(new IAExtTableauIntegration());
    });
});
