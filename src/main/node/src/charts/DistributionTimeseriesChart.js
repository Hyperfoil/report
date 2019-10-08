import React from 'react';
import {
    Label,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import { DateTime } from 'luxon';
//import OverloadTooltip from './OverloadTooltip'
import theme from '../theme';
const keyOrder = ['p99.999', 'p99.99', 'p99.9', 'p99.0', 'p90.0', 'p50.0', 'Mean'];
export const getSeries = (data) => {
    const transformed = {}
    Object.keys(data.phase).forEach((phaseName) => {
        const phase = data.phase[phaseName]
        if (phase.iteration) {
            Object.keys(phase.iteration).forEach((iterationName, iterationIndex) => {
                const iteration = phase.iteration[iterationName];
                if (iteration.fork) {
                    Object.keys(iteration.fork).forEach((forkName, forkIndex) => {
                        const fork = iteration.fork[forkName];
                        if (fork.metric) {
                            Object.keys(fork.metric).forEach((metricName, metricIndex) => {
                                const metric = fork.metric[metricName]
                                if (metric.series) {
                                    const metricSeries = []
                                    metric.series.forEach((series, seriesIndex) => {
                                        const seriesHeaders = series.header;
                                        series.data.forEach((entry, entryIndex) => {
                                            const v = transformed[entry['Start']] || {Start:entry['Start']};
                                            const phaseKey = phaseName + "_" + (iterationName!=="all"?iterationName + "_" : "") + forkName + "_" + metricName;
                                            seriesHeaders.forEach((header,headerIndex)=>{
                                                v[phaseKey+"_"+header]=entry[header]
                                            })
                                            // v['Start'] = entry['Start']
                                            // v['End'] = entry['End']
                                            // v[phaseKey + "_Mean"] = entry['Mean']
                                            // v[phaseKey + "_requests"] = entry['Requests']
                                            // v[phaseKey + "_responses"] = entry['Responses']
                                            // v[phaseKey + "_p90"] = entry['p90.0']
                                            // v[phaseKey + "_90"] = entry['p90.0'] - entry['Mean']
                                            // v[phaseKey + "_p99"] = entry['p99.0']
                                            // v[phaseKey + "_99"] = entry['p99.0'] - entry['p90.0'];
                                            // v[phaseKey + "_p999"] = entry['p99.9']
                                            // v[phaseKey + "_999"] = entry['p99.9'] - entry['p99.0'];
                                            // v[phaseKey + "_p9999"] = entry['p99.99']
                                            // v[phaseKey + "_9999"] = entry['p99.99'] - entry['p99.9'];
                                            transformed[v['Start']] = v;
                                        })
                                    })
                                }
                            })
                        }
                    })
                }

            })
        }
    })
    const converted = Object.values(transformed).sort((a, b) => b.Start - a.Start);
    return converted;
}
export default ({ height, width, data, domain, 
    series = [{
        name: "initialRampUp",
        colorGroup: 'purple',
        phases: [{name: 'initialRampUp_proxy_test'}],
        stats: ['Mean', 'p90.0', 'p99.0', 'p99.9'],
    }],
    right = 
        {
            name: "Requests",
            color: '#A30000',
            stat: 'Requests',
            scaleLabel: 'requests/second',
            phases: ['initialRampUp_proxy_test'],

        }
}) => {
    const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
    const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")
    const lines = series.reduce((rtrn,bar)=>{
        const barStats = new Set(bar.stats);
        bar.phases.forEach((phase,phaseIndex)=>{
            const phaseName = phase.name;
            const sortedKeys = keyOrder.filter(v=>barStats.has(v));
            sortedKeys.forEach((statName,statIndex)=>{
                const colorGroup = theme.colors.chart[bar.colorGroup]
                const color = colorGroup[statIndex+(colorGroup.length-sortedKeys.length)];
                rtrn.push(
                    //Different than WideBar. Support connected lines for stats?
                    //connected stats would override previous sample for that ts? (2 phases with same ts)
                    <Line
                        key={phaseName+"_"+statIndex} 
                        name={statName}
                        dataKey={phaseName+"_"+statName} 
                        stroke={color}
                        connectNulls
                        dot={false}
                        style={{ strokeWidth: 2 }}
                        isAnimationActive={false}
                    />  
                )
            })
        });
        return rtrn;
    },[]);
    const legendPayload = series.map((bar, barIndex) => ({
        color: theme.colors.chart[bar.colorGroup][0],
        fill: theme.colors.chart[bar.colorGroup][0],
        type: 'rect',
        value: bar.name
    })).concat(Object.keys(right).length>0?{
        color: right.color,
        fill: right.color,
        type: 'rect',
        value: right.name
    }:undefined).filter(v=>v!==undefined)    
    const rightLines = Object.keys(right).length>0 ? (
        right.phases.map((phaseName,phaseIndex)=>(
            <Line
                key={phaseIndex}
                yAxisId={1}
                name={right.name}
                dataKey={phaseName+"_"+right.stat}
                stroke={right.color}
                fill={right.color}
                connectNulls
                dot={false}
                isAnimationActive={false}
                style={{ strokeWidth: 1 }}//WideBar uses strokeWidth: 2
            />
        ))
    ) : undefined;
    return (
        <ComposedChart
            width={width}
            height={height}
            data={data}
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                type="number"
                scale="time"
                dataKey="Start"//this is different than WideBar
                tickFormatter={tsToHHmmss}
                domain={domain}
            />
            <YAxis yAxisId={0} orientation="left" tickFormatter={nanoToMs} >
                <Label value="response time" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                {/* <Label value="response time" position="top" angle={0} offset={0} textAnchor='start' style={{ textAnchor: 'start' }} /> */}
            </YAxis>
            {right ?
                (<YAxis yAxisId={1} orientation="right" style={{ fill: right.color }}>
                    <Label value={right.scaleLabel || right.name} position="insideRight" angle={-90} style={{ fill: right.color }} />
                    {/* <Label value="requests" position="top" angle={0} textAnchor='end' style={{ textAnchor: 'end' }} /> */}
                </YAxis>)
                : undefined}
            <Tooltip
                labelFormatter={tsToHHmmss}
                formatter={(e)=>Number(e).toFixed(0)}  
            />
            <Legend payload={legendPayload}/>
            {lines}
            {rightLines}
        </ComposedChart>

    )
}