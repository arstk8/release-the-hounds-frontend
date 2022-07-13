import { MessageHandler } from './MessageHandler'

class RemoteStateManager {
    #requestUrl
    #socket
    #messageHandler
    #stayDead = false

    constructor(requestUrl, user, setNeighbors) {
        this.#requestUrl = requestUrl
        this.#connect()
        this.#messageHandler = new MessageHandler(user, setNeighbors)
    }

    #connect = () => {
        this.#socket = new WebSocket(this.#requestUrl)
        this.#socket.onopen = this.#onOpen
        this.#socket.onclose = this.#onClose
        this.#socket.onmessage = this.#onMessage
    }

    releaseHound = () => this.#makeServerCall('release')

    unreleaseHound = () => this.#makeServerCall('unrelease')

    #makeServerCall = action => {
        const payload = { action: action }
        this.#socket.send(JSON.stringify(payload))
    }

    disconnect = () => {
        this.#stayDead = true
        this.#socket.close()
    }

    #onOpen = () => {
        this.#makeServerCall('neighbors')
    }

    #onClose = () => {
        if (!this.#stayDead) {
            this.#connect()
        }
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

        return new RemoteStateManager(requestUrl, user, setNeighbors)
    }
}

export default RemoteStateManager
