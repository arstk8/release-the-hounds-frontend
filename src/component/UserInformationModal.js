import FormModal from './ui/FormModal'
import Backdrop from './ui/Backdrop'
import { useRef } from 'react'
import { useHistory } from 'react-router-dom'

function UserInformationModal(props) {
    const history = useHistory()

    function submitHandler(event) {
        event.preventDefault()
        localStorage.setItem('username', name.current.value)
        history.push(`/room/${ roomCode.current.value }`)
    }

    const roomCode = useRef()
    const name = useRef()

    return (
        <div>
            <FormModal
                title="User Information"
                submitButtonText="Submit"
                onSubmit={ submitHandler }
            >
                <div className="form-group">
                    <label className="form-label" htmlFor="roomCode">
                        Room Code
                    </label>
                    <input
                        className="form-control"
                        type="text"
                        required
                        id="roomCode"
                        ref={ roomCode }
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="name">
                        Name
                    </label>
                    <input
                        className="form-control"
                        type="text"
                        required
                        id="name"
                        defaultValue={localStorage.getItem('username')}
                        ref={ name }
                    />
                </div>
            </FormModal>
            <Backdrop onDismiss={ props.onDismiss } />
        </div>
    )
}

export default UserInformationModal
