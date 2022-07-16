import Home from './component/Home'
import { Redirect, Route, Switch } from 'react-router-dom'
import Neighborhood from './component/Neighborhood'

function App() {
    return (
        <div>
            <Switch>
                <Route path="/room/:neighborGroup" exact>
                    <Neighborhood />
                </Route>
                <Route path="/" exact>
                    <Home />
                </Route>
                <Route path="*">
                    <Redirect to='/'/>
                </Route>
            </Switch>
        </div>
    )
}

export default App
