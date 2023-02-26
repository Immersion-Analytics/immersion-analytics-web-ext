import {Col, Container, DropdownButton, Dropdown, Row, Table} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {Button, DropdownSelect, Spinner, TextField} from "@tableau/tableau-ui";

import {AddIcon, DeleteIcon, EyeIcon, IconButton, TrashIcon, PropertyBoundTextField} from "./components";
import {IA_MAX_ROWS_TO_LOAD} from "../IAExtensionController";

import {useIAObject, usePropertyValue} from "../lib";
import LoadingSpinner from "../modals/LoadingSpinner";


function VisualizationsControlPanel(props) {
    const {app} = props;
    const {scene} = app;

    // re-render when selection changes
    usePropertyValue(() => scene.selection);
    const visualizations = usePropertyValue(() => scene.visualizations);
    const datasetName = usePropertyValue(() => scene.focusedViz.axes.sourceDatasetProperty);
    const variables = useIAObject(() => scene.database.get(scene.focusedViz.axes.sourceDataset).variables);

    const colormaps = useIAObject(() => scene.colormaps);
    const currentColormapName = usePropertyValue(() => scene.focusedViz.colormapNameProperty);

    const pointSizeProperty = useIAObject(() => scene.vizSettings.pointSizeProperty);

    // Auto select the first visualization if one is not selected
    useEffect(() => {
        if (!scene.focusedViz && visualizations?.count > 0)
            scene.focusedViz = visualizations.get(0);
    });

    const handlePointSizeSlider = e => {
        let value = parseFloat(e.target.value);
        if (isFinite(value))
            pointSizeProperty.set(value);
    }

    const handleColormapSelect = e => {
        if (scene.focusedViz)
            scene.focusedViz.colormapName = e.target.value;
    }

    const validateVizName = (name) => {
        const viz = scene.focusedViz;

        // If not selection, don't show a validation error
        if (!viz)
            return;

        if (!name)
            return "Name must not be empty";

        // If another vizualization already has this name...
        if (viz.name !== name && scene.visualizations.containsKey(name))
            return "Name already used";

        return undefined;
    }

    return (
        <div className='container-lg h-100 px-0'>
            <div className='container-lg'>
                <VisualizationsSelect app={app}
                                      selectedVizName={scene.focusedViz?.name}
                                      vizNames={visualizations?.keys}/>
                <fieldset disabled={!scene.focusedViz}>
                    <Table borderless className='fullwidth-inputs'>
                    <tbody className="ia-viz-info">
                        <tr>
                            <td>Visualization Name:</td>
                            <td>
                                {/* Sets the Name property for the selected IA Visualization */}
                                <PropertyBoundTextField
                                    propertyGetter={() => scene.focusedViz?.nameProperty}
                                    validate={validateVizName} />
                            </td>
                        </tr>
                        <tr>
                            <td>Visualization Data Source:</td>
                            <td>
                                <DataSourceSelectView app={app} selectedDatasetName={datasetName} />
                            </td>
                        </tr>
                        <tr>
                            <td>Point Size:</td>
                            <td>
                                {/* Tableau UI doesn't yet have a slider component */}
                                <input type="range" className="custom-range"
                                       min=".01" max=".15" step=".001"
                                       value={pointSizeProperty.value}
                                       onChange={handlePointSizeSlider}
                                    />
                            </td>
                        </tr>
                        <tr>
                            <td>Colormap:</td>
                            <td>
                                <DropdownSelect className='w-100'
                                                onChange={handleColormapSelect}
                                                value={currentColormapName} >
                                    <option value=''> - Default - ({colormaps.defaultColormapName})</option>
                                    { colormaps.availableColormapNames.map(colormapName => {
                                        return <option value={colormapName} key={colormapName}>{colormapName}</option>;
                                    })}
                                </DropdownSelect>
                            </td>
                        </tr>
                    </tbody>
                    </Table>
                </fieldset>
            </div>

            { scene.focusedViz
                ? <AxisMappings
                              axisGroup={scene.focusedViz.axes}
                              onGetDatasetVariables={() => variables?.keys}
                              onCheckVariableExists={variableName => variables?.containsKey(variableName)}
                />
                : <h6 className='text-secondary text-center'>Please select a visualization</h6>
            }
        </div>
    );
}

export default VisualizationsControlPanel;


function VisualizationsSelect(props) {
    const {selectedVizName, vizNames, app} = props;

    const makeVizSelectOption = vizName => <option key={vizName}>{vizName}</option>;

    return (
        <div className="d-flex justify-content-between">
            <div>
                <DropdownSelect
                    value={selectedVizName ?? ''}
                        onChange={e => app.selectViz(e.target.value)}>
                        { vizNames?.length > 0
                            ? vizNames.map(makeVizSelectOption)
                            : <option>- No Visualizations -</option>}
                    </DropdownSelect>

                    <IconButton icon={AddIcon} onClick={() => app.newViz()} />
                    <IconButton icon={DeleteIcon} onClick={() => app.removeSelectedViz()} />
            </div>
            <div>
                <Button kind='lowEmphasis'
                        onClick={() => app.confirmResetScene()}>
                    <TrashIcon /> Reset Scene
                </Button>
            </div>
        </div>
    )
}

function DataSourceSelectView(props) {
    const {app, selectedDatasetName} = props;

    const selectedDataset = useIAObject(() => app.database.get(selectedDatasetName));
    const rowCount = selectedDataset?.rowCount ?? 0;
    const variableCount = selectedDataset?.variables.count;

    const rowCountWarning = rowCount === IA_MAX_ROWS_TO_LOAD;

    return (
        <Container>
            <Row>
                <DataSourceSelect {...props} />
            </Row>
            <Row>
                <Col className='text-right'>
                    Rows: <span className={rowCountWarning ? 'text-danger' : ''}>{rowCount}</span>,
                    Variables: {variableCount}
                </Col>
            </Row>
        </Container>
        );
}

function DataSourceSelect(props) {
    const {app, selectedDatasetName} = props;

    const datasets = usePropertyValue(() => app.database.datasets);

    const [loading, setLoading] = useState();

    const buildDataSourcesArray = (datasets, platformDataSources) => {
        let items = [];

        items.push({sectionHeaderName: "Active Data Sources:"});
        if (datasets)
            items = items.concat(datasets.keys.map(name => ({ name: name})));

        items.push({sectionHeaderName: "Available Data Sources:", enabledLoadingSpinner: true})
        if (platformDataSources)
            items = items.concat(platformDataSources);

        return items;
    }

    const [dataSourceItems, setDataSourceItems] = useState(buildDataSourcesArray(datasets));

    const updateDataSources = () => {
        setLoading(true);
        app.platform.getDataSourcesAsync()
            .then(platformDataSources => {
                const items = buildDataSourcesArray(datasets, platformDataSources);
                setDataSourceItems(items);
                setLoading(false);
            });
    }

    const makeDataSourceSelectItem = (item, index) => {
        if (item.sectionHeaderName)
            return (
                <Dropdown.Item disabled key={index}>
                    {item.sectionHeaderName}
                    {loading && item.enabledLoadingSpinner ? <Spinner className='inline-spinner' dimension={15} /> : null}
                </Dropdown.Item>);

        return (
            <Dropdown.Item key={index}
                           onClick={() => app.setCurrentVisualizationDataSource(item)}>
                {item.name}
            </Dropdown.Item>
        );
    }

    let dropdownClass = 'flex-grow-1 text-right';

    return (
        <DropdownButton title={selectedDatasetName ? selectedDatasetName : "<Select Data Source>"}
                        onClick={updateDataSources}
                        className={dropdownClass}
                        >
            { dataSourceItems.map(makeDataSourceSelectItem) }
        </DropdownButton>
    );
}

function AxisMappings(props) {
    const {axisGroup, onGetDatasetVariables, onCheckVariableExists} = props;

    // re-render if the axis mappings list property changes
    useIAObject(() => axisGroup);

    const makeMappingRow = axis => {
        const mappingInfo = axisGroup.getMapping(axis.name);
        mappingInfo.axisName = axis.name;   // ensure this is set
        return (
            <AxisMappingRow
                key={axis.name}
                {...mappingInfo}
                axisGroup={axisGroup}
                onGetDatasetVariables={onGetDatasetVariables}
                onCheckVariableExists={onCheckVariableExists} />
        );
    };

    return (
        <Table striped borderless id='ia-axis-mappings'>
            <thead>
                <tr>
                    <th></th>
                    <th>Axis</th>
                    <th>Variable</th>
                </tr>
            </thead>
            <tbody>
                {/* axes.config.axes returns an array of the available axis definitions for this axis group */}
                { axisGroup.config.axes.map(makeMappingRow) }
            </tbody>
        </Table>
    )
}

function AxisMappingRow(props) {
    const {axisName, variableName, enabled, onCheckVariableExists, axisGroup, onGetDatasetVariables} = props;

    // Avoid rendering all variable select dropdown items unless user has clicked the dropdown menu
    const [renderVariableNames, setRenderVariableNames] = useState();

    const variableMissing = variableName && !onCheckVariableExists(variableName);

    const handleVariableSelected = variableName => {
        axisGroup.map(axisName, variableName);

        // Clear dropdown menu dom contents
        setRenderVariableNames(undefined);
    };

    const makeVariableSelectOption = variableName => {
        return (
            <Dropdown.Item key={variableName}
                           onClick={() => handleVariableSelected(variableName)}>
                {variableName}
            </Dropdown.Item>
        );
    }

    let eyeButton = null;
    if (variableName)
    {
        /// Create a toggle cell to enable/disable the current Axis=>Variable mapping
        eyeButton = (
            <Button className='icon-btn'
                    onClick={ () => axisGroup.mappings.setMappingEnabled(axisName, !enabled) }
                    disabled={!variableName}>
                <EyeIcon on={enabled} />
            </Button>
        );
    }

    let variableText = variableName ?? '';
    if (variableMissing)
        variableText += ' <Missing in Dataset>';

    return (
        <tr className='ia-axis-mapping-row'>
            <td>
                { eyeButton }
            </td>
            <td>
                {axisName}
            </td>
            <td>
                <DropdownButton title={variableText}
                                onClick={() => setRenderVariableNames(onGetDatasetVariables())}   // Fill dropdown contents
                                size='lg'
                                className={'ia-axis-mapping' + (variableMissing ? ' missing' : '')}
                >
                    <Dropdown.Item key='-'
                                   onClick={() => handleVariableSelected(null)}>
                        &lt;Unmapped&gt;
                    </Dropdown.Item>
                    { renderVariableNames?.map(makeVariableSelectOption) }
                </DropdownButton>
            </td>
            <td className='buttons'>
                { variableName
                    ? <IconButton icon={DeleteIcon}
                                onClick={() => handleVariableSelected(null)} />
                    : null
                }
            </td>
        </tr>
    );
}
