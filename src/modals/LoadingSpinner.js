import {Collapse, Modal} from "react-bootstrap";
import {Button, Spinner} from "@tableau/tableau-ui";
import {BsTerminal} from "react-icons/all";
import "../styles.css";


function LoadingSpinner()
{
    return (
        <Modal show className='text-nowrap' id='loading-spinner-modal' backdrop='static' keyboard={false}>
            <div className="loading-spinner-icon" aria-busy><Spinner /></div>
            <div className="loading-msg">Loading</div>
            {/*<div>*/}
            {/*    <Button className="ia-show-console" data-toggle="collapse" data-target="#loading-console-display">*/}
            {/*        <BsTerminal />*/}
            {/*    </Button>*/}
            {/*</div>*/}
            {/*<Collapse id="loading-console-display">*/}
            {/*    /!*Content moved here from main console display *!/*/}
            {/*</Collapse>*/}
        </Modal>
    );
}

export default LoadingSpinner;



// <div className="modal" id="loading-spinner-modal" data-backdrop="static" data-keyboard="false" tabIndex="-1">
//     <div className="modal-dialog modal-sm modal-dialog-scrollable">
//         <div className="modal-content text-nowrap">
//             <div className="loading-spinner-icon"><i className="icon ion-load-c"></i></div>
//             <div className="loading-msg">Loading</div>
//             <div>
//                 <button className="btn ia-show-console" type="button" data-toggle="collapse"
//                         data-target="#loading-console-display"><i className="material-icons">personal_video</i></button>
//             </div>
//             <div className="collapse" id="loading-console-display">
//                 <!-- Content moved here from main console display -->
//             </div>
//         </div>
//     </div>
// </div>
