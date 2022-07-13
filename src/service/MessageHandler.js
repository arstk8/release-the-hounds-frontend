import { Status } from '../model/Status'
import { TimeToLiveTracker } from './TimeToLiveTracker'

export class MessageHandler {
    #user
    #setNeighbors
    #timeToLiveTracker

    constructor(user, setNeighbors) {
        this.#user = user
        this.#setNeighbors = setNeighbors
        this.#timeToLiveTracker = new TimeToLiveTracker(this.#clearStatusesPastTimeToLive)
    }

    handleMessage = payload => {
        const action = payload.action
        const data = payload.data

        if ('neighbors' === action) {
            this.#setInitialNeighbors(data)
        } else if ('status' === action || 'release' === action) {
            this.#setNeighborsWithTTLCheck(previousState => {
                return this.#getUpdatedStatus(previousState, data)
            })
        }

        return action
    }

    #setNeighborsWithTTLCheck = updatedStateFetcher => {
        this.#setNeighbors(previousState => {
            const updatedState = updatedStateFetcher(previousState)
            this.#timeToLiveTracker.scheduleTimeToLiveCheck(updatedState)
            return updatedState
        })
    }

    #clearStatusesPastTimeToLive = () => {
        this.#setNeighborsWithTTLCheck(previousState => {
            const currentTimeSeconds = TimeToLiveTracker.getCurrentTimeSeconds()
            return previousState.map(entry => {
                if (entry.timeToLive && entry.timeToLive < currentTimeSeconds) {
                    entry.status = Status.DOGS_INSIDE
                    entry.timeToLive = null
                }
                return entry
            })
        })
    }

    #setInitialNeighbors = data => {
        this.#setNeighbors(
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
    }

    #getUpdatedStatus = (previousState, data) => {
        const lookup = new Map(data.map(houndsOutData => [houndsOutData.username, houndsOutData]))

        return previousState.map(entry => {
            const newData = lookup.get(entry.name)

            let newStatus
            if (newData) {
                newStatus = Status.DOGS_OUTSIDE
            } else if (entry.status) {
                newStatus = entry.status
            } else {
                newStatus = Status.DOGS_INSIDE
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

    #compareNeighbors = (lhs, rhs) => {
        const lhsUser = lhs.name
        const rhsUser = rhs.name
        if (lhsUser === this.#user) {
            return -1
        } else if (rhsUser === this.#user) {
            return 1
        } else {
            return lhsUser.localeCompare(rhsUser)
        }
    }
}
