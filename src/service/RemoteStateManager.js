class RemoteStateManager {
    constructor(socket, user, setNeighbors) {
        this.socket = socket
        this.user = user
        this.setNeighbors = setNeighbors

        socket.onopen = () => this.#makeServerCall('neighbors')
        socket.onmessage = this.#onMessage
    }

    releaseHound = () => this.#makeServerCall('release')

    #makeServerCall = action => {
        const payload = { action: action }
        this.socket.send(JSON.stringify(payload))
    }

    disconnect = () => {
        this.socket.close()
    }

    #onMessage = event => {
        const payload = JSON.parse(event.data)
        const action = payload.action
        const data = payload.data

        if ('neighbors' === action) {
            this.setNeighbors(
                data
                    .map(neighbor => {
                        return {
                            name: neighbor,
                            status: null,
                            timeToLive: null
                        }
                    })
                    .sort(this.#compareNeighbors)
            )
            this.#makeServerCall('status')
        } else if ('status' === action || 'release' === action) {
            this.setNeighbors(previousState => {
                return this.#getUpdatedStatus(previousState, data)
            })

            let currentTimeSeconds = Date.now() / 1000
            const timesToLive = data.map(entry => entry.timeToLive)
            const earliestTimeToLive = Math.min(...timesToLive)

            if (this.timeToLiveChecker) {
                clearTimeout(this.timeToLiveChecker)
            }

            const timeout = Math.max(0, earliestTimeToLive - currentTimeSeconds)
            this.timeToLiveChecker = setTimeout(() => {
                this.setNeighbors(previousState => {
                    currentTimeSeconds = Date.now() / 1000
                    return previousState.map(entry => {
                        if (entry.timeToLive < currentTimeSeconds) {
                            entry.status = 'Dogs Inside'
                            entry.timeToLive = null
                        }
                        return entry
                    })
                })
            }, timeout * 1000)
        }
    }

    #compareNeighbors = (lhs, rhs) => {
        const lhsUser = lhs.name
        const rhsUser = rhs.name
        if (lhsUser === this.user) {
            return -1
        } else if (rhsUser === this.user) {
            return 1
        } else {
            return lhsUser.localeCompare(rhsUser)
        }
    }

    #getUpdatedStatus = (previousState, data) => {
        const lookup = new Map(
            data.map(houndsOutData => [houndsOutData.username, houndsOutData])
        )

        return previousState.map(entry => {
            const newData = lookup.get(entry.name)

            let newStatus
            if (newData && RemoteStateManager.#satisfiesTimeToLive(newData)) {
                newStatus = 'Dogs Outside'
            } else if (entry.status) {
                newStatus = entry.status
            } else {
                newStatus = 'Dogs Inside'
            }

            let newTimeToLive
            if (newData) {
                newTimeToLive = newData.timeToLive
            } else {
                newTimeToLive = entry.timeToLive
            }

            entry.status = newStatus
            entry.timeToLive = newTimeToLive
            return entry
        })
    }

    static #satisfiesTimeToLive(entry) {
        const epochSeconds = Date.now() / 1000
        return entry.timeToLive == null || entry.timeToLive >= epochSeconds
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
