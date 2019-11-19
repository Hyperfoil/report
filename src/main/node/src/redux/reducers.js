import {combineReducers} from 'redux'
import {connectRouter} from 'connected-react-router'


const data = (state={},action)=>state

export default (history) => combineReducers({
    router: connectRouter(history),
    data
})

export const splitName = name => {
    const split = name.split(/[\/_]/);
    const rtrn = {}
    if (split.length === 1) {
        rtrn.phase = split[0];
        rtrn.iteration = ":DEFAULT:";
        rtrn.fork = ":DEFAULT:";
    }
    if (split.length === 2) {
        rtrn.phase = split[0];
        if( /^[0-9]{3}$/.test(split[1]) ){
            rtrn.fork = ":DEFAULT:"
            rtrn.iteration = split[1];
    
        }else{
            rtrn.iteration = ":DEFAULT:"
            rtrn.fork = split[1];    
        }
    } else if (split.length === 3) {
        rtrn.phase = split[0];
        rtrn.iteration = split[1];
        rtrn.fork = split[2];
    }
    return rtrn;
}
export const buildName = (phase, iteration, fork, delim="/") => {
    var rtrn = phase;
    if (! (":DEFAULT:" === iteration) ) {
        rtrn = rtrn + delim + iteration;
    }
    if (! (":DEFAULT:" === fork) ) {
        rtrn = rtrn + delim + fork;
    }
    return rtrn;
}