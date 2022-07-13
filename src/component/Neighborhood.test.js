import { fireEvent, render, screen } from '@testing-library/react'
import Neighborhood from './Neighborhood'
import { MemoryRouter, Route } from 'react-router-dom'
import { act } from 'react-dom/test-utils'
import { Status } from '../model/Status'

describe('hound updates', () => {
    const componentJsx = (
        <MemoryRouter initialEntries={['/some-group']}>
            <Route path="/:neighborGroup">
                <Neighborhood />
            </Route>
        </MemoryRouter>
    )
    let localStore
    let openSpy
    let messageSpy
    let closeMock
    let sendMock

    let mockDate = +new Date(2022, 6, 12)

    beforeEach(() => {
        localStore = {
            username: 'Oliver'
        }

        global.Date.now = jest.fn().mockImplementation(() => mockDate)

        localStorage.__proto__.getItem = jest.fn().mockImplementation(key => {
            return key in localStore ? localStore[key] : null
        })

        closeMock = jest.fn()
        sendMock = jest.fn()
        global.WebSocket = class {
            close = closeMock
            send = sendMock

            // noinspection JSUnusedGlobalSymbols
            set onopen(onopen) {
                openSpy = onopen
            }

            // noinspection JSUnusedGlobalSymbols
            set onmessage(onmessage) {
                messageSpy = onmessage
            }
        }
    })

    it('should be able to render hounds', async () => {
        render(componentJsx)

        await act(() => {
            openSpy()
            messageSpy({
                data: '{"action": "neighbors", "data": ["Oliver", "Ellie", "Sophie"]}'
            })
        })

        const hounds = screen.getAllByTestId('hound')
        expect(hounds.length).toBe(3)

        expect(hounds[0]).toHaveTextContent('Oliver')
        expect(hounds[0]).not.toHaveTextContent('Release')
        expect(hounds[0]).not.toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[0]).not.toHaveTextContent(Status.DOGS_INSIDE.toString())

        expect(hounds[1]).toHaveTextContent('Ellie')
        expect(hounds[1]).not.toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[1]).not.toHaveTextContent(Status.DOGS_INSIDE.toString())

        expect(hounds[2]).toHaveTextContent('Sophie')
        expect(hounds[2]).not.toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[2]).not.toHaveTextContent(Status.DOGS_INSIDE.toString())
    })

    it('should be able to render hound statuses', async () => {
        render(componentJsx)

        await act(() => {
            openSpy()
            messageSpy({
                data: '{"action": "neighbors", "data": ["Oliver", "Ellie", "Sophie"]}'
            })
            const timeToLiveInFuture = mockDate / 1000 + 1
            messageSpy({
                data: `{"action": "status", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInFuture}}]}`
            })
        })

        const hounds = screen.getAllByTestId('hound')
        expect(hounds.length).toBe(3)

        expect(hounds[0]).toHaveTextContent('Oliver')
        expect(hounds[0]).toHaveTextContent('Release')
        expect(hounds[0]).not.toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[0]).toHaveTextContent(Status.DOGS_INSIDE.toString())

        expect(hounds[1]).toHaveTextContent('Ellie')
        expect(hounds[1]).toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[1]).not.toHaveTextContent(Status.DOGS_INSIDE.toString())

        expect(hounds[2]).toHaveTextContent('Sophie')
        expect(hounds[2]).not.toHaveTextContent(Status.DOGS_OUTSIDE.toString())
        expect(hounds[2]).toHaveTextContent(Status.DOGS_INSIDE.toString())
    })

    it('should be able to release the hounds for the current user', async () => {
        render(componentJsx)

        await act(() => {
            openSpy()
            messageSpy({
                data: '{"action": "neighbors", "data": ["Oliver", "Ellie", "Sophie"]}'
            })
            const timeToLiveInFuture = mockDate / 1000 + 1
            messageSpy({
                data: `{"action": "status", "data": [{"username": "Ellie", "timeToLive": ${timeToLiveInFuture}}]}`
            })

        })

        fireEvent.click(screen.getByText('Release'))

        expect(sendMock).toHaveBeenCalledWith(JSON.stringify({action: 'release'}))
    })

    it('should disconnect websocket when component unmounts', async () => {
        const { unmount } = render(componentJsx)

        unmount()
        expect(closeMock).toHaveBeenCalled()
    })
})
