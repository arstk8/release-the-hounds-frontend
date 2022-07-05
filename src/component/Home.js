import { useState } from 'react'
import UserInformationModal from './UserInformationModal'

function Home() {
    const [modalIsOpen, setModalIsOpen] = useState(false)

    function clickHandler() {
        setModalIsOpen(true)
    }

    function dismissHandler() {
        setModalIsOpen(false)
    }

    return (
        <div className="container">
            <div className="row">
                <div className="col">
                    <h1 className="text-center">Release the hounds!</h1>
                </div>
            </div>
            <div className="row my-2">
                <div className="col centered-content">
                    <button className="btn btn-primary" onClick={clickHandler}>
                        Create a room
                    </button>
                </div>
            </div>
            <div className="row my-2">
                <div className="col centered-content">
                    <button
                        className="btn btn-secondary"
                        onClick={clickHandler}
                    >
                        Join a room
                    </button>
                </div>
            </div>

            {modalIsOpen && <UserInformationModal onDismiss={dismissHandler} />}
        </div>
    )
}

export default Home
