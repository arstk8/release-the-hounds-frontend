import { render, screen } from '@testing-library/react'
import Neighborhood from './Neighborhood'
import { MemoryRouter, Route } from 'react-router-dom'
import { act } from 'react-dom/test-utils'

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

    beforeEach(() => {
        localStore = {
            username: 'bob'
        }

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
        expect(hounds[0]).not.toHaveTextContent('Dogs Outside')
        expect(hounds[0]).not.toHaveTextContent('Dogs Inside')

        expect(hounds[1]).toHaveTextContent('Ellie')
        expect(hounds[1]).not.toHaveTextContent('Dogs Outside')
        expect(hounds[1]).not.toHaveTextContent('Dogs Inside')

        expect(hounds[2]).toHaveTextContent('Sophie')
        expect(hounds[2]).not.toHaveTextContent('Dogs Outside')
        expect(hounds[2]).not.toHaveTextContent('Dogs Inside')
    })

    it('should disconnect websocket when component unmounts', async () => {
        const { unmount } = render(componentJsx)

        unmount()
        expect(closeMock).toHaveBeenCalled()
    })
})
