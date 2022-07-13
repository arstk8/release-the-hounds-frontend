import RemoteStateManager from './RemoteStateManager'

describe('remote state management', () => {
    let openSpy
    let messageSpy
    let closeMock
    let sendMock
    let urlSpy
    let setNeighborsMock

    let mockDate = +new Date(2022, 6, 12)

    beforeEach(() => {
        closeMock = jest.fn()
        sendMock = jest.fn()

        global.Date.now = jest.fn().mockImplementation(() => mockDate)

        global.WebSocket = class {
            close = closeMock
            send = sendMock

            constructor(url) {
                urlSpy = url
            }

            // noinspection JSUnusedGlobalSymbols
            set onopen(onopen) {
                openSpy = onopen
            }

            // noinspection JSUnusedGlobalSymbols
            set onmessage(onmessage) {
                messageSpy = onmessage
            }
        }
        setNeighborsMock = jest.fn()

        RemoteStateManager.create(
            'wss://baseurl.com',
            'some room',
            'Sir barks a lot',
            setNeighborsMock
        )
    })

    it('uses the proper url to connect', () => {
        expect(urlSpy).toBe(
            'wss://baseurl.com?neighborGroup=some%20room&username=Sir%20barks%20a%20lot'
        )
    })

    it('fetches the current neighbors upon connecting', () => {
        openSpy()

        expect(sendMock).toHaveBeenCalledWith(
            JSON.stringify({ action: 'neighbors' })
        )
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

        expect(sendMock).toHaveBeenCalledWith(
            JSON.stringify({ action: 'status' })
        )
    })

    it('sets the neighbors state upon receiving the current status', () => {
        const previousState = [
            { name: 'Sir barks a lot', status: null, timeToLive: null },
            { name: 'Ellie', status: null, timeToLive: null },
            { name: 'Sophie', status: null, timeToLive: null }
        ]

        const timeToLiveInFuture = mockDate / 1000 + 60
        messageSpy({
            data: `{"action": "status", "data": [
                {"username": "Sir barks a lot", "timeToLive": ${timeToLiveInFuture}}, 
                {"username": "Sophie", "timeToLive": ${timeToLiveInFuture}}
            ]}`
        })

        const stateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const updateResult = stateUpdateFunction(previousState)

        expect(updateResult).toEqual([
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: timeToLiveInFuture
            },
            { name: 'Ellie', status: 'Dogs Inside', timeToLive: null },
            {
                name: 'Sophie',
                status: 'Dogs Outside',
                timeToLive: timeToLiveInFuture
            }
        ])
    })

    it('sets the state of some neighbors upon receiving a release', () => {
        const previousState = [
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: null
            },
            { name: 'Ellie', status: 'Dogs Inside', timeToLive: null },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ]

        const timeToLiveInFuture = mockDate / 1000 + 60
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInFuture}}]}`
        })

        const stateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const updateResult = stateUpdateFunction(previousState)

        expect(updateResult).toEqual([
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: null
            },
            {
                name: 'Ellie',
                status: 'Dogs Outside',
                timeToLive: timeToLiveInFuture
            },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ])
    })

    it('sets an incoming "outside" hound\'s status to "inside" if the timeToLive has passed', () => {
        const previousState = [
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: null
            },
            { name: 'Ellie', status: 'Dogs Inside', timeToLive: null },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ]

        const timeToLiveInPast = mockDate / 1000 - 60
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInPast}}]}`
        })

        const stateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const updateResult = stateUpdateFunction(previousState)

        expect(updateResult).toEqual([
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: null
            },
            {
                name: 'Ellie',
                status: 'Dogs Inside',
                timeToLive: timeToLiveInPast
            },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ])
    })

    it('sets an existing "outside" hound\'s status to "inside" if the timeToLive has passed', async () => {
        const timeToLiveWellInFuture = mockDate / 1000 + 1000
        const previousState = [
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: timeToLiveWellInFuture
            },
            { name: 'Ellie', status: 'Dogs Inside', timeToLive: null },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ]

        const timeToLiveBarelyInFuture = mockDate / 1000 + 1
        messageSpy({
            data: `{"action": "release", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveBarelyInFuture}}]}`
        })

        const previousStateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const previousUpdateResult = previousStateUpdateFunction(previousState)

        mockDate += 2000

        await pause(2000)
        const stateUpdateFunction = setNeighborsMock.mock.calls[1][0]
        const updateResult = stateUpdateFunction(previousUpdateResult)

        expect(updateResult).toEqual([
            {
                name: 'Sir barks a lot',
                status: 'Dogs Outside',
                timeToLive: timeToLiveWellInFuture
            },
            {
                name: 'Ellie',
                status: 'Dogs Inside',
                timeToLive: null
            },
            { name: 'Sophie', status: 'Dogs Inside', timeToLive: null }
        ])
    })

    function pause(milliseconds) {
        return new Promise(resolve => {
            setTimeout(() => resolve(), milliseconds)
        })
    }
})
