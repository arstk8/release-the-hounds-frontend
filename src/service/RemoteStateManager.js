import { MessageHandler } from './MessageHandler'

class RemoteStateManager {
    #socket
    #messageHandler

    constructor(socket, user, setNeighbors) {
        this.#socket = socket
        this.#messageHandler = new MessageHandler(user, setNeighbors)

        socket.onopen = this.#onOpen
        socket.onmessage = this.#onMessage
    }

    releaseHound = () => this.#makeServerCall('release')

    #makeServerCall = action => {
        const payload = { action: action }
        this.#socket.send(JSON.stringify(payload))
    }

    disconnect = () => {
        this.#socket.close()
    }

    #onOpen = () => {
        this.#makeServerCall('neighbors')
    }

    #onMessage = event => {
        const payload = JSON.parse(event.data)
        const action = this.#messageHandler.handleMessage(payload)
        if ('neighbors' === action) {
            this.#makeServerCall('status')
        }
    }

    static create(url, roomCode, user, setNeighbors) {
        const encodedRoomCode = encodeURIComponent(roomCode)
        const encodedUser = encodeURIComponent(user)
        const requestUrl = `${url}?neighborGroup=${encodedRoomCode}&username=${encodedUser}`
        const socket = new WebSocket(requestUrl)

        return new RemoteStateManager(socket, user, setNeighbors)
    }
}

export default RemoteStateManager
