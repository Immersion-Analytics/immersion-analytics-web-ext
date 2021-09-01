import {Col, Container, DropdownButton, Dropdown, Row, Table} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {Button, DropdownSelect, TextField} from "@tableau/tableau-ui";

import {AddIcon, DeleteIcon, IconButton, TrashIcon} from "./components";
import {IA_MAX_ROWS_TO_LOAD} from "../IAExtensionController";

import {usePropertyValue} from "../lib";


// function useVizName(viz) {
//     const [vizName, setVizName] = useState();
//
//     useEffect(() => {
//         if (viz)
//             return viz.name.onChanged(name => setVizName(name));
//         setVizName('');
//     })
//     return vizName;
// }

function VisualizationsControlPanel(props) {
    const {app} = props;
    const {scene} = app;

    // re-render when selection changes
    usePropertyValue(() => scene.selection);
    const visualizations = usePropertyValue(() => scene.visualizations);
    const vizName = usePropertyValue(() => scene.focusedViz.nameProperty, '');
    const datasetName = usePropertyValue(() => scene.focusedViz.axes.sourceDatasetProperty);

    useEffect(() => {
        if (!scene.focusedViz && visualizations?.count > 0)
            scene.focusedViz = visualizations.get(0);
    });

    /** Sets the Name property for the selected IA Visualization */
    const handleVizNameInput = e => {
        const newName = e.target.value;
        const selectedViz = scene.focusedViz;
        if (!selectedViz || !newName)
            return;

        // Cancel if a plot already has this name
        if (scene.visualizations.containsKey(newName))
            return;

        selectedViz.name = newName;
    }

    return (
        <Container fluid>
            <Table borderless>
                <thead>
                    <tr>
                        <th colSpan="2">
                            <VisualizationsSelect app={app}
                                                  selectedVizName={scene.focusedViz?.name}
                                                  vizNames={visualizations?.keys}/>
                        </th>
                    </tr>
                </thead>
                <tbody className="ia-viz-info">
                    <tr>
                        <td>Visualization Name:</td>
                        <td>
                            <TextField value={vizName}
                                       onChange={handleVizNameInput} />
                        </td>
                    </tr>
                    <tr>
                        <td>Visualization Data Source:</td>
                        <td>
                            <DataSourceSelectView app={app} selectedDatasetName={datasetName}/>
                        </td>
                    </tr>
                    <tr>
                        <td>Point Size:</td>
                        <td>
                            {/* Tableau UI doesn't yet have a slider component */}
                            <input type="range" className="custom-range ia-point-size" min=".01" max=".15" step=".001"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Colormap:</td>
                        <td>
                            <DropdownSelect>

                            </DropdownSelect>
                        </td>
                    </tr>
                </tbody>
            </Table>
            <div className="table-responsive ia-viz-info" id="ia-axis-mappings">
                <table className="table">
                    <thead>
                    <tr>
                        <th>Axis</th>
                        <th>Variable</th>
                    </tr>
                    </thead>
                </table>
            </div>
        </Container>
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

    const selectedDataset = app.database.get(selectedDatasetName);
    const rowCount = selectedDataset?.rowCount ?? 0;
    const variableCount = selectedDataset?.variables.count;

    const rowCountWarning = rowCount === IA_MAX_ROWS_TO_LOAD;

    return (
        <Container>
            <Row>
                <DataSourceSelect {...props} />
            </Row>
            <Row>
                <Col />
                <Col>
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

    const [dataSourceItems, setDataSourceItems] = useState([]);

    const updateDataSources = () => {
        app.platform.getDataSourcesAsync()
            .then(platformDataSources => {

                let items = [];

                items.push({sectionHeaderName: "Active Data Sources:"});
                if (datasets)
                {
                    items = items.concat(datasets.keys.map(name => ({ name: name})));
                }

                items.push({sectionHeaderName: "Available Data Sources:"})
                items = items.concat(platformDataSources);

                setDataSourceItems(items);
            });
    }

    const makeDataSourceOption = (item, index) => {
        if (item.sectionHeaderName)
            return <option disabled key={index}>{item.sectionHeaderName}</option>

        return <Dropdown.Item key={index}
                              onClick={() => app.setCurrentVisualizationDataSource(item)}>
            {item.name}
        </Dropdown.Item>
    }

    return (
        // <DropdownSelect onClick={updateDataSources}>
        //     { dataSourceItems.map(makeDataSourceOption) }
        // </DropdownSelect>
        <DropdownButton title={selectedDatasetName ? selectedDatasetName : "<Select Data Source>"}
                        onClick={updateDataSources}
                        size='sm'
                        variant='secondary'
                        >
            { dataSourceItems.map(makeDataSourceOption) }
        </DropdownButton>
    );
}
