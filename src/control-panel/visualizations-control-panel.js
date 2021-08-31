import {Col, Container, Row, Table} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {Button, DropdownSelect, TextField} from "@tableau/tableau-ui";
import {ImPlus, IoCloseCircle, MdDelete} from "react-icons/all";
import {AddIcon, DeleteIcon, IconButton, TrashIcon} from "./components";

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

    const vizName = usePropertyValue(() => scene.focusedViz.nameProperty);

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
                            <VisualizationsSelect app={app} />
                        </th>
                    </tr>
                </thead>
                <tbody className="ia-viz-info">
                    <tr>
                        <td>Visualization Name:</td>
                        <td>
                            <TextField value={vizName}
                                       onClick={handleVizNameInput} />
                        </td>
                    </tr>
                    <tr>
                        <td>Visualization Data Source:</td>
                        <td>
                            <DropdownSelect>

                            </DropdownSelect>
                            <Container>
                                <Row>
                                    <Col />
                                    <Col>
                                        Rows: <span className="ia-dataset-row-count"></span>, Variables: <span
                                        className="ia-dataset-var-count"></span>
                                    </Col>
                                </Row>
                            </Container>
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
    const {app} = props;
    const {scene} = app;

    const visualizations = usePropertyValue(() => scene.visualizations);

    const makeVizSelectOption = vizName => <option key={vizName}>{vizName}</option>;

    return (
        <Container fluid>
            <Row>
                <Col>
                    <DropdownSelect
                        value={scene.focusedViz?.name}
                        onChange={e => app.selectViz(e.target.value)}>
                        { visualizations?.keys.map(makeVizSelectOption) }
                    </DropdownSelect>

                    <IconButton icon={AddIcon} onClick={() => app.newViz()} />
                    <IconButton icon={DeleteIcon} onClick={() => app.removeSelectedViz()} />
                </Col>
                <Col />
                <Col>
                    <Button kind='lowEmphasis'
                            onClick={() => app.confirmResetScene()}>
                        <TrashIcon /> Reset Scene
                    </Button>
                </Col>
            </Row>
        </Container>
    )
}
