import RemoteStateManager from './RemoteStateManager'
import { Status } from '../model/Status'

describe('connection management', () => {
    let closeMock
    let webSocketCreationFunction = jest.fn()
    let urlSpy
    let closeSpy

    let remoteStateManager

    beforeEach(() => {
        closeMock = jest.fn()

        global.WebSocket = class {
            constructor(url) {
                urlSpy = url
                webSocketCreationFunction()
            }

            close = closeMock.mockImplementation(() => {
                closeSpy()
            })

            set onclose(onclose) {
                closeSpy = onclose
            }
        }

        remoteStateManager = RemoteStateManager.create(
            'wss://baseurl.com',
            'some room',
            'Sir barks a lot',
            jest.fn()
        )
    })

    it('uses the proper url to connect', () => {
        expect(urlSpy).toBe('wss://baseurl.com?neighborGroup=some%20room&username=Sir%20barks%20a%20lot')
    })

    it('closes the websocket upon disconnect', () => {
        remoteStateManager.disconnect()
        expect(closeMock).toHaveBeenCalled()
        expect(webSocketCreationFunction).toHaveBeenCalledTimes(1)
    })
})

describe('message handling', () => {
    let openSpy
    let messageSpy
    let sendMock
    let setNeighborsMock

    let mockDateSeconds = new Date(2022, 6, 12) / 1000

    beforeEach(() => {
        sendMock = jest.fn()

        global.Date.now = jest.fn().mockImplementation(() => mockDateSeconds * 1000)

        global.WebSocket = class {
            send = sendMock

            set onopen(onopen) {
                openSpy = onopen
            }

            set onmessage(onmessage) {
                messageSpy = onmessage
            }
        }
        setNeighborsMock = jest.fn()

        RemoteStateManager.create('wss://baseurl.com', 'some room', 'Sir barks a lot', setNeighborsMock)
    })

    it('fetches the current neighbors upon connecting', () => {
        openSpy()

        expect(sendMock).toHaveBeenCalledWith(JSON.stringify({ action: 'neighbors' }))
    })

    it('sets the neighbors state upon receiving neighbors', () => {
        messageSpy({
            data: '{"action": "neighbors", "data": ["Ellie", "Sir barks a lot", "Sophie"]}'
        })

        expect(setNeighborsMock).toHaveBeenCalledWith([
            { name: 'Sir barks a lot', status: null, timeToLive: null },
            { name: 'Ellie', status: null, timeToLive: null },
            { name: 'Sophie', status: null, timeToLive: null }
        ])
    })

    it('set neighbors in sorted order, with the current user floating to top', () => {
        messageSpy({
            data: '{"action": "neighbors", "data": ["Z", "x", "a", "A", "Sir barks a lot", "B", "b"]}'
        })

        expect(setNeighborsMock).toHaveBeenCalledWith([
            { name: 'Sir barks a lot', status: null, timeToLive: null },
            { name: 'a', status: null, timeToLive: null },
            { name: 'A', status: null, timeToLive: null },
            { name: 'b', status: null, timeToLive: null },
            { name: 'B', status: null, timeToLive: null },
            { name: 'x', status: null, timeToLive: null },
            { name: 'Z', status: null, timeToLive: null }
        ])
    })

    it('fetches the current status upon receiving neighbors', () => {
        messageSpy({
            data: '{"action": "neighbors", "data": ["Sir barks a lot", "Ellie", "Sophie"]}'
        })

        expect(sendMock).toHaveBeenCalledWith(JSON.stringify({ action: 'status' }))
    })

    it('sets the neighbors state upon receiving the current status', () => {
        const previousState = [
            { name: 'Sir barks a lot', status: null, timeToLive: null },
            { name: 'Ellie', status: null, timeToLive: null },
            { name: 'Sophie', status: null, timeToLive: null }
        ]

        const timeToLiveInFuture = mockDateSeconds + 60
        messageSpy({
            data: `{"action": "status", "data": [
                {"username": "Sir barks a lot", "timeToLive": ${timeToLiveInFuture}}, 
                {"username": "Sophie", "timeToLive": ${timeToLiveInFuture}}
            ]}`
        })

        const updateResult = callSetNeighborsResult(0, previousState)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveInFuture }
        ])
    })

    it('sets the state of some neighbors upon receiving a release', () => {
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: null },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveInFuture = mockDateSeconds + 60
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInFuture}}]}`
        })

        const updateResult = callSetNeighborsResult(0, previousState)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: null },
            { name: 'Ellie', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveInFuture },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    function callSetNeighborsResult(sequence, previousState) {
        const stateUpdateFunction = setNeighborsMock.mock.calls[sequence][0]
        return stateUpdateFunction(previousState)
    }
})

describe('ttl behavior', () => {
    let messageSpy
    let setNeighborsMock

    let mockDateSeconds = new Date(2022, 6, 12) / 1000

    beforeEach(() => {
        global.Date.now = jest.fn().mockImplementation(() => mockDateSeconds * 1000)

        global.WebSocket = class {
            set onmessage(onmessage) {
                messageSpy = onmessage
            }
        }
        setNeighborsMock = jest.fn()

        RemoteStateManager.create('wss://baseurl.com', 'some room', 'Sir barks a lot', setNeighborsMock)
    })

    it('sets an incoming "outside" hound\'s status to "inside" if the timeToLive has passed', async () => {
        const timeToLiveWellInFuture = mockDateSeconds + 1000
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveInPast = mockDateSeconds - 60
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInPast}}]}`
        })

        const previousUpdateResult = callSetNeighborsResult(0, previousState)
        await pause(0)
        const updateResult = callSetNeighborsResult(1, previousUpdateResult)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    it('sets an incoming "outside" hound\'s status to "inside" if the timeToLive has been cleared', async () => {
        const timeToLiveWellInFuture = mockDateSeconds + 1000
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        messageSpy({
            data: `{"action": "release", "data": [{"username": "Sir barks a lot", "timeToLive": null}]}`
        })

        const updateResult = callSetNeighborsResult(0, previousState)
        await pause(0)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    it('clears an "outside" hound\'s status if the timeToLive has passed', async () => {
        const timeToLiveWellInFuture = mockDateSeconds + 1000
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveBarelyInFuture = mockDateSeconds + 1
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveBarelyInFuture}}]}`
        })

        const previousUpdateResult = callSetNeighborsResult(0, previousState)
        mockDateSeconds += 1.001
        await pause(1)
        const updateResult = callSetNeighborsResult(1, previousUpdateResult)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    it('reschedules the timeToLive check after receiving a new release', async () => {
        const timeToLiveWellInFuture = mockDateSeconds + 1000
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveBarelyInFuture = mockDateSeconds + 1
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveBarelyInFuture}}]}`
        })

        const timeToLiveThatIsPastNextTTLCheck = mockDateSeconds + 2
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Sophie", "timeToLive": ${timeToLiveThatIsPastNextTTLCheck}}]}`
        })

        const previousUpdateResult = callSetNeighborsResult(0, previousState)
        const nextUpdateResult = callSetNeighborsResult(1, previousUpdateResult)

        mockDateSeconds += 2.001
        await pause(2)

        const updateResult = callSetNeighborsResult(2, nextUpdateResult)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    it('clears an "outside" hound\'s status if the timeToLive has passed and it\'s not the first TTL to pass', async () => {
        const timeToLiveWellInFuture = mockDateSeconds + 1000
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveBarelyInFuture = mockDateSeconds + 1
        const timeToLiveThatIsPastNextTTLCheck = mockDateSeconds + 2
        messageSpy({
            data: `{"action": "status", "data": [
            {"username": "Ellie", "timeToLive": ${timeToLiveBarelyInFuture}},
            {"username": "Sophie", "timeToLive": ${timeToLiveThatIsPastNextTTLCheck}}
            ]}`
        })

        const previousUpdateResult = callSetNeighborsResult(0, previousState)

        mockDateSeconds += 1.001
        await pause(1)

        const nextUpdateResult = callSetNeighborsResult(1, previousUpdateResult)

        mockDateSeconds += 1.001
        await pause(1)
        const updateResult = callSetNeighborsResult(2, nextUpdateResult)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: timeToLiveWellInFuture },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ])
    })

    it('should not keep doing time to live checks when there are no more times to live', async () => {
        const previousState = [
            { name: 'Sir barks a lot', status: Status.DOGS_OUTSIDE, timeToLive: null },
            { name: 'Ellie', status: Status.DOGS_INSIDE, timeToLive: null },
            { name: 'Sophie', status: Status.DOGS_INSIDE, timeToLive: null }
        ]

        const timeToLiveInPast = mockDateSeconds - 60
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInPast}}]}`
        })

        const previousUpdateResult = callSetNeighborsResult(0, previousState)
        await pause(0)
        callSetNeighborsResult(1, previousUpdateResult)

        await pause(0)

        expect(setNeighborsMock.mock.calls.length).toBe(2)
    })

    function callSetNeighborsResult(sequence, previousState) {
        const stateUpdateFunction = setNeighborsMock.mock.calls[sequence][0]
        return stateUpdateFunction(previousState)
    }

    function pause(seconds) {
        return new Promise(resolve => {
            setTimeout(() => resolve(), seconds * 1000)
        })
    }
})
