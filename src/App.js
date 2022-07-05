import Home from './component/Home'
import { Route, Switch } from 'react-router-dom'
import Neighborhood from './component/Neighborhood'

function App() {
    return (
        <div>
            <Switch>
                <Route path="/" exact>
                    <Home />
                </Route>
                <Route path="/:neighborGroup">
                    <Neighborhood />
                </Route>
            </Switch>
        </div>
    )
}

export default App
