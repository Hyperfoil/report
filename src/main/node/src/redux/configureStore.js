import {createBrowserHistory, createHashHistory} from 'history'
import {applyMiddleware, createStore} from 'redux'
import {routerMiddleware} from 'connected-react-router'
import createRootReducer from './reducers'

export const history = createHashHistory();//createBrowserHistory();//
export default function configureStore(preloadedState){
    const store = createStore(
        createRootReducer(history),
        {data:preloadedState},
        applyMiddleware(
            routerMiddleware(history)
        )
    )
    return store
}