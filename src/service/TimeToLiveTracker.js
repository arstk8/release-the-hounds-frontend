export class TimeToLiveTracker {
    #timeoutId
    #timeUpCallback

    constructor(timeUpCallback) {
        this.#timeUpCallback = timeUpCallback
    }

    scheduleTimeToLiveCheck = data => {
        const timeToWait = TimeToLiveTracker.#getTimeToWait(data)
        if (timeToWait === null) {
            return
        }

        if (this.#timeoutId) {
            clearTimeout(this.#timeoutId)
        }

        this.#timeoutId = setTimeout(this.#timeUpCallback, timeToWait)
    }

    static #getTimeToWait(data) {
        const timesToLive = data.map(entry => entry.timeToLive)
        if (timesToLive.every(timeToLive => timeToLive === null)) {
            return null
        }

        const earliestTimeToLive = Math.min(...timesToLive)
        const timeout = Math.max(0, earliestTimeToLive - TimeToLiveTracker.getCurrentTimeSeconds())
        return timeout * 1000
    }

    static getCurrentTimeSeconds() {
        return Date.now() / 1000
    }
}
