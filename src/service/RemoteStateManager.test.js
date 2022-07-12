import RemoteStateManager from './RemoteStateManager'

describe('remote state management', () => {
    let openSpy
    let messageSpy
    let closeMock
    let sendMock
    let urlSpy
    let setNeighborsMock

    beforeEach(() => {
        closeMock = jest.fn()
        sendMock = jest.fn()
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
            { name: 'Sir barks a lot', status: null },
            { name: 'Ellie', status: null },
            { name: 'Sophie', status: null }
        ])
    })

    it('set neighbors in sorted order, with the current user floating to top', () => {
        messageSpy({
            data: '{"action": "neighbors", "data": ["Z", "x", "a", "A", "Sir barks a lot", "B", "b"]}'
        })

        expect(setNeighborsMock).toHaveBeenCalledWith([
            { name: 'Sir barks a lot', status: null },
            { name: 'a', status: null },
            { name: 'A', status: null },
            { name: 'b', status: null },
            { name: 'B', status: null },
            { name: 'x', status: null },
            { name: 'Z', status: null }
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
            { name: 'Sir barks a lot', status: null },
            { name: 'Ellie', status: null },
            { name: 'Sophie', status: null }
        ]

        messageSpy({
            data: '{"action": "status", "data": [{"username": "Sir barks a lot", "timeToLive": 1657480215}, {"username": "Sophie", "timeToLive": 1657480215}]}'
        })

        const stateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const updateResult = stateUpdateFunction(previousState)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: 'Dogs Outside' },
            { name: 'Ellie', status: 'Dogs Inside' },
            { name: 'Sophie', status: 'Dogs Outside' }
        ])
    })

    it('sets the state of some neighbors upon receiving a release', () => {
        const previousState = [
            { name: 'Sir barks a lot', status: 'Dogs Outside' },
            { name: 'Ellie', status: 'Dogs Inside' },
            { name: 'Sophie', status: 'Dogs Inside' }
        ]

        messageSpy({
            data: '{"action": "release", "data": [{"username": "Ellie", "timeToLive": 1657480215}]}'
        })

        const stateUpdateFunction = setNeighborsMock.mock.calls[0][0]
        const updateResult = stateUpdateFunction(previousState)

        expect(updateResult).toEqual([
            { name: 'Sir barks a lot', status: 'Dogs Outside' },
            { name: 'Ellie', status: 'Dogs Outside' },
            { name: 'Sophie', status: 'Dogs Inside' }
        ])
    })
})
