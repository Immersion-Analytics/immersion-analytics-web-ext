/**
 * ©2021 Virtual Cove, Inc. d/b/a Immersion Analytics. All Rights Reserved. Patented.
 *
 * Immersion Analytics Runtime - Tableau Dashboard Extension
 * Utilizes the Immersion Analytics Runtime javascript API and Tableau Dashboard Extensions API
 * to drive holographic visualizations in AR/VR/XR devices like Hololens2 or Oculus from a Tableau dashboard
 */


import React, {useState, useEffect} from 'react';
import {Button} from "@tableau/tableau-ui";

import {Col, Row, Container, Image} from "react-bootstrap";

import {BsTerminal, GrConnect, GiSunglasses} from "react-icons/all";
import {ConnectionStatus, IALogo} from "./control-panel/components";


function IAOverviewDisplay(props) {
    const {app} = props;

    const showConfig = (panel) => {
        const dialogUrl = `${window.location.origin}/${app.platform.id}-${panel}`;
        console.log("Opening IA dialog at " + dialogUrl);

        const dialogOptions = { width: 500, height: 500 };

        app.platform.openDialog(dialogUrl, dialogOptions);
    };

    return (
    <Container fluid>
            <Row>
                <Col md='auto'>
                    <IALogo />
                </Col>
                <Col md='auto'>
                    <Button className='ia-show-connect mr-1' density='high'
                        onClick={() => showConfig('connection')}>

                        <GrConnect /><span>&nbsp;Connect</span>
                    </Button>

                    <Button className="ia-show-viz-config" density='high'
                            onClick={() => showConfig('visualizations')}>

                        <GiSunglasses /><span>&nbsp;Visualizations</span>
                    </Button>

                    {/*    <Button className="icon-btn ia-show-console" data-target="#console-out-modal" data-toggle="modal">*/}
                    {/*        <BsTerminal />*/}
                    {/*    </Button>*/}
                </Col>
                <Col md='auto'>
                    {/*<span className="d-inline-block text-nowrap">Connection Status:</span>&nbsp;*/}
                    <ConnectionStatus app={app} />
                </Col>
                <Col></Col>
            </Row>
        </Container>
    );
}

export default IAOverviewDisplay;