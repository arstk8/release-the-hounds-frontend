class RemoteStateManager {
    constructor(socket, setNeighbors) {
        this.socket = socket
        this.setNeighbors = setNeighbors

        socket.onopen = () => this.#makeServerCall('neighbors')
        socket.onmessage = this.#onMessage
    }

    #makeServerCall = action => {
        const payload = { action: action }
        this.socket.send(JSON.stringify(payload))
    }

    disconnect = () => {
        this.socket.close()
    }

    #onMessage = event => {
        const payload = JSON.parse(event['data'])
        const action = payload['action']
        const data = payload['data']

        if ('neighbors' === action) {
            this.setNeighbors(
                data.map(neighbor => {
                    return { name: neighbor, status: null }
                })
            )
            this.#makeServerCall('status')
        } else if ('status' === action || 'release' === action) {
            this.setNeighbors(previousState => {
                return this.#getUpdatedStatus(previousState, data)
            })
        }
    }

    #getUpdatedStatus = (previousState, data) => {
        const lookup = new Map(
            data.map(houndsOutData => [
                houndsOutData['username'],
                houndsOutData
            ])
        )
        return previousState.map(entry => {
            let newStatus
            if (lookup.has(entry['name'])) {
                newStatus = 'Dogs Outside'
            } else if (entry['status']) {
                newStatus = entry['status']
            } else {
                newStatus = 'Dogs Inside'
            }
            entry['status'] = newStatus
            return entry
        })
    }

    static create(url, roomCode, user, setNeighbors) {
        const encodedRoomCode = encodeURIComponent(roomCode)
        const encodedUser = encodeURIComponent(user)
        const requestUrl = `${url}?neighborGroup=${encodedRoomCode}&username=${encodedUser}`
        const socket = new WebSocket(requestUrl)

        return new RemoteStateManager(socket, setNeighbors)
    }
}

export default RemoteStateManager
