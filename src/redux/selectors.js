import { createSelector } from 'reselect'
import { findHyperfoilData } from './store'

export const DEFAULT_NAME = ":DEFAULT:";

/*
    input is the HF stat name
    output is {phase, fork, iteration}
*/
export const splitName = name => {
    const split = name.split(/[/_]/);
    const rtrn = {}
    if (split.length === 1) {
        rtrn.phase = split[0];
        rtrn.iteration = DEFAULT_NAME;
        rtrn.fork = DEFAULT_NAME;
    }
    if (split.length === 2) {
        rtrn.phase = split[0];
        if( /^[0-9]{3}$/.test(split[1]) ){
            rtrn.fork = DEFAULT_NAME
            rtrn.iteration = split[1];

        }else{
            rtrn.iteration = DEFAULT_NAME
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
    if (! (DEFAULT_NAME === iteration) ) {
        rtrn = rtrn + delim + iteration;
    }
    if (! (DEFAULT_NAME === fork) ) {
        rtrn = rtrn + delim + fork;
    }
    return rtrn;
}

/*
    input is [{phase:"",fork:"",iter:"",total:{...}}]
    output is {fork: {metric: [total]}} sorted by sorter
 */
export const getForkMetricMap = (sorter = (a,b)=>a.start-b.start, reducer=(rtrn,v)=>rtrn.push(v)) => (state)=>{
    const rtrn = {}
    if(state && state.data && state.data.stats){
        state.data.stats.forEach(stat=>{
            if(typeof rtrn[stat.fork] === "undefined"){
                rtrn[stat.fork] = {}
            }
            if(typeof rtrn[stat.fork][stat.metric] === "undefined"){
                rtrn[stat.fork][stat.metric] = {}
            }
            if(typeof rtrn[stat.fork][stat.metric][stat.phase] === "undefined"){
                rtrn[stat.fork][stat.metric][stat.phase] = []
            }
            reducer(rtrn[stat.fork][stat.metric][stat.phase],stat)
            //rtrn[stat.fork][stat.metric][stat.phase].push(stat)
        });
        Object.keys(rtrn).forEach(forkName => {
            const fork = rtrn[forkName]
            Object.keys(fork).forEach(metricName => {
                const metric = fork[metricName];
                Object.keys(metric).forEach(phaseName => {
                    const phaseArray = metric[phaseName];
                    phaseArray.sort(sorter);
                })
            })
        })
    }
    return rtrn;
}

function hfdata(state) {
   if (!state || !state.data || !state.data.currentRun) {
      return undefined
   }
   return findHyperfoilData(state.data.currentRun)
}

function hfalldata(state) {
   if (!state || !state.data || !state.data.runs) {
      return []
   }
   return state.data.runs.map(run => findHyperfoilData(run)).filter(run => !!run);
}

export const currentRunIdSelector = state => {
   const runData = hfdata(state)
   return runData && runData.info.id
}
export const allRunIdsSelector = state => hfalldata(state).map(run => run.info.id)

/*
    get all the stats that match the filter key = value
*/
//this is always returning a new array, that breaks memoization
export const getStats = (filter={}) => (state)=>{
    const data = hfdata(state)
    if (data && data.stats){
        return data.stats.filter(v=>{
            return Object.keys(filter).map(key=>v[key]===filter[key]).reduce((prev,current)=>prev && current, true)
        })
    }else{
        return []
    }
}

/*
    get start and end for the first and last entry in each stat series
*/
export const getPhaseTransitionTs = (state)=>{
    const data = hfdata(state)
    let rtrn = []
    if(data && data.stats){
        data.stats.forEach(stat=>{
            rtrn.push(stat.series[0].startTime)
            rtrn.push(stat.series[stat.series.length-1].startTime)

            rtrn.push(stat.series[0].endTime)
            rtrn.push(stat.series[stat.series.length-1].endTime)
        })
    }
    return [...new Set(rtrn)]
}
export const getDomain = (stats)=>{
    let rtrn = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    stats.forEach(stat=>{
        stat.series.forEach(entry=>{
            if (entry.startTime < rtrn[0]) {
                rtrn[0] = entry.startTime;
            }
            if (entry.endTime > rtrn[1]) {
                rtrn[1] = entry.endTime;
            }
        })
    })
    return rtrn;
}

export const getInfo = (state)=> {
   const data = hfdata(state)
   return data && data.info ? data.info : {}
}

export const getData = (state)=> hfdata(state)

export const getAlerts = (state)=>state.alert

export const getAllTotals = createSelector(
    getStats(),
    (stats) => [ ...new Set(stats.map(v=>v.total)) ]
)
//(state)=> state && state.data && state.data.stats ? state.data.stats.map(v=>v.total) : [];
export const getAllNames = createSelector(
    getStats(),
    (stats) => [ ...new Set(stats.map(v=>v.name)) ]
)

//(state)=>[...new Set( state && state.data && state.data.stats ? state.data.stats.map(v=>v.name) : [])];
export const getAllPhaseNames = createSelector(
    getStats(),
    (stats) => [ ...new Set(stats.map(v=>v.phase)) ]
)
//(state)=>[...new Set( state && state.data && state.data.stats ? state.data.stats.map(v=>v.phase) : [])];
export const getAllForkNames = createSelector(
    getStats(),
    (stats) => [ ...new Set(stats.map(v=>v.fork)) ]
)

//     (state)=>[...new Set(state && state.data && state.data.stats ? state.data.stats.map(v=>v.fork) : [])]
export const getAllMetricNames = createSelector(
    getStats(),
    (stats) => [ ...new Set(stats.map(v=>v.metric)) ]
)

//(state)=>[...new Set(state && state.data && state.data.stats ? state.data.stats.map(v=>v.metric) : [])];
export const getAllFailures = state => {
   const data = hfdata(state)
   return data && data.failures ? data.failures : []
}

export const getCpu = state => {
   return (state && state.data && state.data.currentRun && state.data.currentRun.cpu && state.data.currentRun.cpu.data) || []
}

export const getConnections = state => {
    const data = hfdata(state)
    return data && data.connections ? data.connections : {}
 }

export const allRunsTotalsSelector = state => {
   const runs = hfalldata(state)
   return runs.reduce((m, d) => { m[d.info.id] = d.stats.map(s => s.total); return m }, {})
}

export const getAgentNames = state => {
   const data = hfdata(state)
   return data && data.agents ? data.agents.map(a => a.name) : []
}

export const getSessions = state => {
    const data = hfdata(state)
    return data && data.sessions ? data.sessions : []
}