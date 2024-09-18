import { createHashHistory } from 'history'
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';
import { connectRouter } from 'connected-react-router'
import thunk from 'redux-thunk';
import * as qs from 'query-string';
import fetchival from 'fetchival';

export const history = createHashHistory();//createBrowserHistory();//

const DATA_SCHEMA = "http://hyperfoil.io/run-schema/v3.0"

const LOADED = "data/loaded";
const SELECT_RUN = "data/select_run"
const ERROR = "alert/error";
const CLEAR = "alert/clear";

const dataReducer = (state = false, action) => {
    switch (action.type) {
        case LOADED:
            state = {
               runs: action.data,
               currentRun: action.data[0],
            }
            break;
        case SELECT_RUN:
            state = {
               runs: state.runs,
               currentRun: state.runs.find(r => findHyperfoilData(r).info.id === action.runId)
            }
            break;
        default: {
            state = {...state}
            break;
        }
    }
    return state;
}
const alertReducer = (state = [], action) => {
    switch (action.type) {
        case ERROR:
            const { title, variant, message } = action;
            state = [...state, { title, variant, message }]
            break;
        case CLEAR:
            state = []
            break;
        default: {
            state = [...state]
            break;
        }
    }
    return state;
}

const appReducers = combineReducers({
    router: connectRouter(history),
    data: dataReducer,
    alert: alertReducer,
})
const enhancer = compose(
    applyMiddleware(
        thunk,
    ),
)

export function findHyperfoilData(runData) {
   if (!runData) {
      return undefined
   }
   if (runData["$schema"] === DATA_SCHEMA) {
      return runData;
   }
   return Object.values(runData).find(v => v["$schema"] === DATA_SCHEMA)
}

function checkRunData(data, url) {
   if (findHyperfoilData(data)) {
      return data
   } else {
      alert({
         title: "No Hyperfoil data in report.",
         variant: "danger",
         message: "Report loaded from " + url + " does not contain any data with schema <code>" + DATA_SCHEMA + "</code>"
      })
      return undefined
   }
}

const loaded = (data, url) => {
    store.dispatch({
        type: LOADED,
        data
    })
}
export const alert = ({ title, variant, message }) => {
    store.dispatch({
        type: ERROR,
        title, variant, message
    })
}

export const selectRun = runId => {
   store.dispatch({
      type: SELECT_RUN,
      runId,
   })
}

const store = createStore(
    appReducers,
    enhancer
)
const q = qs.parse(window.location.search)

if (window && window.__DATA__ && Object.keys(window.__DATA__).length > 0) {
    let data = window.__DATA__ || { info: {}, stats: [], sessions: [], agents: [] };
    delete window.__DATA__;
    if (!Array.isArray(data)) {
       data = [data]
    }
    loaded(data.map(run => checkRunData(run, "this document")).filter(run => !!run));
} else if (q.data) {
    var config = {
        responseAs: 'json'
    }
    if (q.token && q.token !== "") {
        config.headers = {
            Authorization: "Bearer " + q.token
        }
        window.history.replaceState(window.history.state, "", "?data=" + q.data)
    }
    const runs = Array.isArray(q.data) ? q.data : [q.data]
    Promise.all(runs.map(url => fetchival(url, config).get().catch(error => {
        alert({
            title: "Failed to load data",
            message: `could not load data from <a target="_blank" rel="noopener noreferrer" href="${q.data}">${q.data}</a>`
        })
    }).then(run => checkRunData(run)))).then(response => {
       loaded(response.filter(run => !!run))
    })
} else {
    alert({
        title: "Failed to load data",
        message: "missing <code>?data</code> query parameter"
    })
}
export default store;