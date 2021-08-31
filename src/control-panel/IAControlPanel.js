/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */
import {Container, Row, Col} from "react-bootstrap";
import {Tabs} from "@tableau/tableau-ui";
import ConnectionControlPanel from "./connection-control-panel";
import VisualizationsControlPanel from "./visualizations-control-panel";
import {useHistory, useRouteMatch} from 'react-router-dom'
import {getPanelUrl, usePropertyValue} from "../lib";
import {ConnectionIcon, ConnectionStatus, IALogo, VisualizationsIcon} from "./components";
import {FcScatterPlot, MdCastConnected} from "react-icons/all";


function IAControlPanel(props) {
    const history = useHistory();
    // const routeMatch = useRouteMatch();
    let { app, platformId, panelId } = props;

    const tabs = [
        { content: <span><ConnectionIcon /> Connection</span>, id: "connection", component: props => <ConnectionControlPanel {...props} /> },
        { content: <span><VisualizationsIcon /> Visualizations</span>, id: "visualizations", component: props => <VisualizationsControlPanel {...props} /> }
    ]

    console.log("current panel: " + panelId)

    const tabIndexLookup = {
        '' : 0,
        'connection' : 0,
        'visualizations' : 1,
    }

    if (panelId === undefined)
        panelId = '';

    const selectedTabIndex = tabIndexLookup[panelId];
    if (selectedTabIndex == undefined)
        return (<div>Unknown Panel</div>);

    console.log("Launching IA Control Panel");

    const goToPanel = index => {
        const panelUrl = getPanelUrl(platformId, tabs[index].id);
        history.push(panelUrl);
    };


    return (
        <Container fluid>
            <Row>
                <Col>
                    <IALogo />
                </Col>
                <Col>
                    <ConnectionStatus app={app}/>
                </Col>

            </Row>
            <Row>
                <Col>
                    <Tabs
                        activation='manual'
                        onTabChange={goToPanel}
                        selectedTabIndex={selectedTabIndex}
                        tabs={tabs}
                        >
                        { tabs[selectedTabIndex].component(props) }
                    </Tabs>
                </Col>
            </Row>
            <Row>

            </Row>
        </Container>
    );
}

export default (IAControlPanel);