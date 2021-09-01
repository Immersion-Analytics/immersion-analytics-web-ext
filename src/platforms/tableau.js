
import {parseJSON} from "../lib";
import {DialogModeHash} from "../App";

const {$, tableau} = window;

export const IATableauPlatformId = 'tableau';

/** Source Type identifier applied to IA tables bound to Tableau data sources  */
const IATableauSourceType = 'tableau';

/** Lookup for translating Tableau column data types to equivalent IA column types */
const Tableau2IADataTypeLookup = {
    'bool' : 'bool',
    'float' : 'float',
    'int' : 'int',
    'date' : 'timestamp',
    'date-time' : 'timestamp',
    'string' : 'string',
    'spatial' : null,
}

/**
 * Integration layer binding Tableau Dashboard Extension API to Immersion Analytics Runtime API.
 * Retrieves list of datasources and creates IATableauDataSourceBindings between
 * Tableau Worksheet LogicalTables and IA data tables.
 */
export class IATableauPlatform {

    constructor() {
        this.id = IATableauPlatformId;
        this._datasetBindings = {}
    }

    /** Initialize the Tableau dashboard extension API.
     * Ensure the bindings list is updated any time a new IA table is added or removed
     * in the IA runtime Database
     */
    init(ia, callbacks) {
        let $this = this;
        this.callbacks = callbacks;
        this.ia = ia;
        this.database = ia.scene.database;

        const isDialogMode = window.location.hash === DialogModeHash;

        tableau.extensions.initializeAsync()
            .then(() => {
                console.log("Tableau JS Initialized");

                if (!isDialogMode)
                    $this.database.datasets.onChanged(() => $this._updateBindings());

                this._handleInitialized();
            })
            .catch(error => {
                console.error("Tableau initialization error:", error);
            });

        // Bindings should not be managed by sub-dialogs of the extension
        if (!isDialogMode)
            this._updateBindings();
    }

    _handleInitialized() {
        tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, e => {
            console.log("Tableau Extension Settings changed");
            this.callbacks.onSettingsChanged(e.newSettings);
        });

        this.callbacks.onInitialized();

        // Load last saved settings from dashboard
        this.callbacks.onSettingsChanged(tableau.extensions.settings.getAll());
    }

    openDialog(url, options) {
        tableau.extensions.ui.displayDialogAsync(url, null, options)
            .then((closePayload) => {
                console.log("IA Dialog closed");
            })
            .catch((error) => {
                switch (error.errorCode) {
                    case tableau.ErrorCodes.DialogClosedByUser:
                        console.log("IA dialog closed by user");
                        break;
                    case tableau.ErrorCodes.DialogAlreadyOpen:
                        alert("The Immersion Analytics configuration dialog is already open in another window");
                        break;
                    default:
                        console.error("IA Dialog Error: " + error.message);
                }
            });
    }

    saveSettings(settings) {
        let changed = false;
        Object.entries(settings).forEach(entry => {
            const [key, value] = entry;
            if (value === tableau.extensions.settings.get(key))
                return;

            tableau.extensions.settings.set(key, value);
            changed = true;
        });

        if (!changed)
            return;

        tableau.extensions.settings.saveAsync()
            .then(() => console.log("IA extension settings saved"))
            .catch(() => console.error("Could not save extension settings"));
    }

    /**
     * Create a new IA table based on data source metadata.
     * @dataSrc.name is used for the IA table name.
     * @dataSrc.type is recorded to the IA table's SourceType property.
     * Any additional properties are written as json to the IA table's SourceInfo property
     */
    createTableForDataSource(dataSrc) {
        let datasetName = dataSrc.name;
        let dataset = this.database.get(datasetName);

        if (!dataset)
        {
            dataset = this.ia.create.Dataset(datasetName)
            this.database.datasets.add(dataset);
        }

        // Return early if table is already bound to this worksheet
        if (dataset.sourceType === IATableauSourceType)
        {
            let srcInfo = parseJSON(dataset.sourceInfo);
            if (srcInfo && srcInfo.worksheetName === dataSrc.worksheetName)
                return;
        }

        dataset.sourceType = dataSrc.type;

        delete dataSrc.name;
        delete dataSrc.type;

        // Write any remaining properties to SourceInfo as JSON
        dataset.sourceInfo = $.isEmptyObject(dataSrc) ? "" : JSON.stringify(dataSrc);

        this._updateBindings();
        // TODO handle SourceType or SourceInfo change callback
    }

    /**
     * Process the list of data tables in the IA runtime and create Tableau bindings for any
     * whose source type is equal to `IATableauSourceType`
     */
    _updateBindings() {
        const datasets = this.database.datasets;

        datasets.keys.forEach(name => {
            console.log("Processing table " + name);
            let dataset = datasets[name];

            // check if binding already exists
            if (this._datasetBindings[name])
                return;

            let srcType = dataset.sourceType;
            if (srcType != IATableauSourceType)
                return;

            let src = parseJSON(dataset.sourceInfo);
            if (!src || !src.worksheetName)
                return;

            let worksheet = this._getTableauWorksheet(src.worksheetName);
            if (!worksheet)
            {
                console.log("Worksheet '" + src.worksheetName + "' does not exist in this Tableau dashboard");
                return;
            }

            let binding = new IATableauDataSourceBinding(datasets, worksheet, src.logicalTableId, name);
            this._datasetBindings[name] = binding;

            // TODO handle table or worksheet renaming
        });

        // Remove inactive bindings
        for (let name in this._datasetBindings) {
            if (datasets.containsKey(name))
                continue;

            const binding = this._datasetBindings[name];
            binding.dispose();
            delete this._datasetBindings[name];
        }
    }

    /** Compile all Worksheet LogicalTables available in this dashboard */
    getDataSourcesAsync() {
        return Promise.all(
            tableau.extensions.dashboardContent.dashboard.worksheets
                .map(this._getDataSourcesForWorksheetAsync))
            .then(dataSources => [].concat(...dataSources));        // Flatten the array of per-worksheet datasource arrays
    }

    /** Create metadata object for each LogicalTable in this worksheet */
    _getDataSourcesForWorksheetAsync(worksheet) {
        return worksheet.getUnderlyingTablesAsync()
            .then(tables => tables.map(table => {
                return {                                // build a data source info object for each logical table in the worksheet
                    name : worksheet.name + '/' + table.id,
                    type : IATableauSourceType,
                    worksheetName : worksheet.name,
                    logicalTableId : table.id
                };
            })
                .concat({
                    name : worksheet.name + " (Summary Data)",
                    type : IATableauSourceType,
                    worksheetName : worksheet.name,
                }));
    }

    _getTableauWorksheet(sheetName) {
        // Go through all the worksheets in the dashboard and find the one we want
        return tableau.extensions.dashboardContent.dashboard.worksheets.find(function(sheet) {
            return sheet.name === sheetName;
        });
    }
}


/**
 * Binds a Tableau LogicalTable to an IA Data Table.
 * Listens for selection or filter changes in the tableau worksheet, then reloads
 * worksheet data for the bound LogicalTable and applies it to the bound IA Data Table
 */
class IATableauDataSourceBinding {
    // TODO dispose this, or don't update when a table is not currently referenced?

    constructor(allDatasets, tableauWorksheet, logicalTableId, datasetName)
    {
        this.allDatasets = allDatasets;
        this.worksheet = tableauWorksheet;
        this.tableId = logicalTableId;
        this.datasetName = datasetName;
        this._unregisterListenerFunctions = [];
        console.log("Initializing data binding for " + datasetName);
        this.updateData();
    }

    dispose() {
        this._unregisterListeners();
    }

    /** Unregister selection+filter change listener */
    _unregisterListeners() {
        this._unregisterListenerFunctions.forEach(unregister => unregister());
        this._unregisterListenerFunctions = [];
    }

    /** Register worksheet selection and filter change listeners */
    _registerListeners() {
        let $this = this;

        this._unregisterListenerFunctions.push(this.worksheet.addEventListener(
            tableau.TableauEventType.MarkSelectionChanged,
            () => $this.updateData()));

        this._unregisterListenerFunctions.push(this.worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged,
            () => $this.updateData()));
    }

    /** When the Tableau Worksheet data table changes, this method pulls the updated dataset and sends
     * it to the IA data table/Visualization
     */
    updateData() {
        this._unregisterListeners();

        let $this = this;
        this.getDataAsync()
            .then(table => $this.setTableData(table))
            .then(() => $this._registerListeners())
    }

    getDataAsync() {
        let options = {
            includeAllColumns:true,     // We want to make all columns available to Visualize // TODO only load columns which have been mapped to an axis
            maxRows: 2000       // AM DEBUGGING We get browser memory errors if too many rows are loaded
        };

        if (this.tableId)
            return this.worksheet
                .getUnderlyingTableDataAsync(this.tableId, options)
                .then(this.formatUnderlyingTableData);
        else
            return this.worksheet
                .getSummaryDataAsync(options)
                .then(this.formatSummaryTableData)

    }

    formatUnderlyingTableData(worksheetData) {
        let dataRows = worksheetData.data;

        const dataColumns = worksheetData.columns.map(function(column) {
            let type = Tableau2IADataTypeLookup[column.dataType];
            if (!type)
                return null;

            let index = column.index;

            return {
                name : column.fieldName,
                type : type,
                data : dataRows.map(row => row[index].nativeValue)
            }
        });
        return dataColumns;
    }

    formatSummaryTableData(worksheetSummaryData) {
        const {data, columns} = worksheetSummaryData;

        const dimensions = {}
        let measureNamesIndex = -1;
        let measureValuesIndex = -1;

        columns.forEach(column => {
            const {fieldName, index} = column;
            if (fieldName == "Measure Names")
                measureNamesIndex = index;
            else if (fieldName == "Measure Values")
                measureValuesIndex = index;
            else {
                dimensions[index] = fieldName;
            }
        });

        const hasMeasures = measureNamesIndex >=0 && measureValuesIndex >= 0;
        // OPTIMIZE if no measures are present, we can shortcut to
        // use formatUnderlyingTableData() instead

        const itemsLookup = {};

        // Dictionary of (column name => column type)
        const resultColumnNameTypeLookup = {};
        Object.entries(dimensions).forEach(entry => {
            const [index, name] = entry;
            // Add dimensions to the result column name => type dictionary
            resultColumnNameTypeLookup[name] = columns[index].dataType;
        });

        data.forEach(row => {
            // Build a unique key identifying this item based on its dimensions
            let itemKey = "";
            for (let index in dimensions)
                itemKey += '{{' + row[index].formattedValue + '}}';

            // get or create a new object for this unique item
            let item = itemsLookup[itemKey];
            if (!item)
            {
                item = itemsLookup[itemKey] = {};

                // Store dimensions values in the newly created item
                for (let index in dimensions)
                    item[dimensions[index]] = row[index].nativeValue;
            }

            if (!hasMeasures)
                return;

            // Store the measure value from this data row
            const measureName = row[measureNamesIndex].formattedValue;
            const measureValue = row[measureValuesIndex].nativeValue;
            item[measureName] = measureValue;

            resultColumnNameTypeLookup[measureName] = 'float';   // Add measure to the result column name dict if not already present
        });

        const itemsArray = Object.values(itemsLookup);

        return Object.entries(resultColumnNameTypeLookup).map(entry => {
            let [columnName, columnType] = entry;
            columnType = Tableau2IADataTypeLookup[columnType];
            if (!columnType)
                return null;

            return {
                name: columnName,
                type: columnType,
                data: itemsArray.map(item => item[columnName])
            };
        });
    }

    /** Convert Tableau Worksheet data into IA data table format, and apply to the bound IA Data Table */
    setTableData(dataColumns) {
        console.log("Dataset update: " + this.datasetName);

        let dataTable = {
            name : this.datasetName,
            columns : dataColumns.filter(c => c)    // remove null columns
        }

        const dataset = this.allDatasets.getKey(this.datasetName);
        if (!dataset){
            console.error("Warning: trying to update non-existing dataset: " + this.datasetName);
            return;
        }
        dataset.setData(dataTable);
    }
}

