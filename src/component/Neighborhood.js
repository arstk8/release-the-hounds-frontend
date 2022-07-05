import { useParams } from 'react-router-dom'
import Hound from './Hound'
import { useEffect, useState } from 'react'
import RemoteStateManager from '../service/RemoteStateManager'

function Neighborhood() {
    const { neighborGroup } = useParams()
    const user = localStorage.getItem('username')

    const [neighbors, setNeighbors] = useState([])

    useEffect(() => {
        const stateManager = RemoteStateManager.create(
            'wss://api.releasethehoundsapp.com',
            neighborGroup,
            user,
            setNeighbors
        )

        return () => stateManager.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div>
            <div className="container">
                <div className="row my-2">
                    <div className="col centered-content">
                        <h1>Release the Hounds!</h1>
                    </div>
                </div>
                <div className="row my-2">
                    <div className="col centered-content">
                        <h4>
                            Howdy, { user }. Welcome to { neighborGroup }!
                        </h4>
                    </div>
                </div>
                { Array.from(neighbors.values()).map(neighbor => {
                    return (
                        <Hound
                            key={ neighbor.name }
                            user={ neighbor.name }
                            status={ neighbor.status }
                        />
                    )
                }) }
            </div>
        </div>
    )
}

export default Neighborhood
