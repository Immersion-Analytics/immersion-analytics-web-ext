
import {parseJSON} from "../lib";

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
    init(ia, onInitialized) {
        let $this = this;
        this.ia = ia;
        this.database = ia.scene.database;

        tableau.extensions.initializeAsync()
            .then(function() {
                console.log("Tableau JS Initialized");

                $this.database.datasets.onChanged(() => $this._updateBindings());
                console.error("Handling multi dataset initializations...");

                onInitialized();
            })
            .catch(error => {
                console.error("Tableau initialization error:", error);
            });

        this._updateBindings();
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
        if (dataset.sourceType == IATableauSourceType)
        {
            let srcInfo = parseJSON(dataset.sourceInfo);
            if (srcInfo && srcInfo.worksheetName == dataSrc.worksheetName)
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
        let datasets = this.database.datasets;
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

            let binding = new IATableauDataSourceBinding(worksheet, src.logicalTableId, this.ia, dataset)
            this._datasetBindings[dataset.name] = binding;

            // TODO handle table or worksheet renaming
        });
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

    constructor(tableauWorksheet, logicalTableId, ia, table)
    {
        this.worksheet = tableauWorksheet;
        this.tableId = logicalTableId;
        this.table = table;
        this._unregisterListenerFunctions = [];
        console.log("Initializing data binding for " + table.Name);
        this.updateData();
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
            return this.worksheet.getUnderlyingTableDataAsync(this.tableId, options)
        else
            return this.worksheet.getSummaryDataAsync(options)

    }

    /** Convert Tableau Worksheet data into IA data table format, and apply to the bound IA Data Table */
    setTableData(worksheetData) {
        console.log("Data table update: " + this.table.name);

        let dataRows = worksheetData.data;

        let columns = worksheetData.columns.map(function(column) {
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

        let table = {
            name : this.worksheet.name,
            columns : columns.filter(c => c)    // remove null columns
        }

        this.table.setData(table);
    }

}

