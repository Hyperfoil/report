import {combineReducers} from 'redux'
import {connectRouter} from 'connected-react-router'


const data = (state={},action)=>state

export default (history) => combineReducers({
    router: connectRouter(history),
    data
})