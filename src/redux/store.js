import React, { useState, useMemo } from 'react';
import { createBrowserHistory, createHashHistory } from 'history'
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';
import { connectRouter } from 'connected-react-router'
import thunk from 'redux-thunk';
import * as qs from 'query-string';

import fetchival from 'fetchival';

export const history = createHashHistory();//createBrowserHistory();//

export const DATA_SCHEMA = "http://hyperfoil.io/run-schema/v2.0"

const LOADED = "data/loaded";
const ERROR = "alert/error";
const CLEAR = "alert/clear";

const dataReducer = (state = false, action) => {
    switch (action.type) {
        case LOADED: {
            state = action.data;
        }
            break;
    }
    return state;
}
const alertReducer = (state = [], action) => {
    switch (action.type) {
        case ERROR: {
            const { title, variant, message } = action;
            state = [...state, { title, variant, message }]
        } break;
        case CLEAR: {
            state = []
        } break;
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

export const loaded = (data) => {
    if (data["$schema"] === DATA_SCHEMA || Object.values(data).some(v => v["$schema"] === DATA_SCHEMA)) {
       store.dispatch({
           type: LOADED,
           data
       })
    } else {
       alert({
         title: "No Hyperfoil data in report.",
         variant: "danger",
         message: "Loaded report does not contain any data with schema <code>" + DATA_SCHEMA + "</code>"
       })
    }
}
export const alert = ({ title, variant, message }) => {
    store.dispatch({
        type: ERROR,
        title, variant, message
    })
}

const store = createStore(
    appReducers,
    enhancer
)
const q = qs.parse(window.location.search)

if (window && window.__DATA__ && Object.keys(window.__DATA__).length > 0) {
    const data = window.__DATA__ || { info: {}, stats: [], sessions: [], agents: [] };
    delete window.__DATA__;
    loaded(data);
} else if (q.data) {
    var config = {
        responseAs: 'json'
    }
    if (q.token && q.token != "") {
        config.headers = {
            Authorization: "Bearer " + q.token
        }
    }
    fetchival(q.data, config).get().then(response => {
        loaded(response)
    }, error => {
        alert({
            title: "Failed to load data",
            message: `could not load data from <a target="_blank" rel="noopener noreferrer" href="${q.data}">${q.data}</a>`
        })
    })

} else {
    alert({
        title: "Failed to load data",
        message: "missing <code>?data</code> query parameter"
    })
}
export default store;