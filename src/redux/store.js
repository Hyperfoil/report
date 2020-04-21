import React, { useState, useMemo } from 'react';
import {createBrowserHistory, createHashHistory} from 'history'
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';
import {connectRouter} from 'connected-react-router'
import thunk from 'redux-thunk';
import * as qs from 'query-string';

import fetchival from 'fetchival';

export const history = createHashHistory();//createBrowserHistory();//

const LOADED = "data/loaded";

const dataReducer = (state = {}, action) =>{
    switch(action.type){
        case LOADED:{
            state = action.data;
        }
        break;
    }
    return state;
}

const appReducers = combineReducers({
    router: connectRouter(history),
    data: dataReducer,
})
const enhancer = compose(
    applyMiddleware(
        thunk,
    ),
)

export const loaded = (data)=>{
    store.dispatch({
        type:LOADED,
        data
    })
}

const store = createStore(
    appReducers,
    enhancer
)

if(window && window.__DATA__){
    const data = window.__DATA__ || {info:{},stats:[],sessions:[],agents:[]};
    console.log("embedded",data)
    delete window.__DATA__;
    loaded(data);
}
const q = qs.parse(window.location.search)
if(q.data){
    fetchival(q.data,{
        responseAs:'json'
    }).get().then(response=>{
        
        loaded(response)
    },error=>{

    })
}

export default store;

