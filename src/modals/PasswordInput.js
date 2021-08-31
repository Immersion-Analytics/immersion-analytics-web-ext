import {Form, Modal} from "react-bootstrap";
import {Button, TextField} from "@tableau/tableau-ui";

function PasswordInput() {
    return (
        <Modal id='pw-input-modal'>
            <Modal.Header closeButton>
                <Modal.Title>Enter Password</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p className='pw-msg'></p>
                <Form inline>
                    <TextField className='pw-input'
                               label='Password: ' />
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button>Submit</Button>
            </Modal.Footer>
        </Modal>
    );
}

// <div role="dialog" tabIndex="-1" className="modal fade" id="pw-input-modal">
//     <div className="modal-dialog" role="document">
//         <div className="modal-content">
//             <div className="modal-header">
//                 <h4 className="modal-title">Enter Password</h4>
//                 <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span
//                     aria-hidden="true">×</span></button>
//             </div>
//             <div className="modal-body">
//                 <p className="pw-msg">&lt;message&gt;</p>
//                 <form className="form-inline">
//                     <div className="form-group"><label>Password: </label><input type="password"
//                                                                                 className="form-control pw-input"/>
//                     </div>
//                 </form>
//             </div>
//             <div className="modal-footer">
//                 <button className="btn btn-light" type="button" data-dismiss="modal">Cancel</button>
//                 <button className="btn btn-primary" type="button">Submit</button>
//             </div>
//         </div>
//     </div>
// </div>
