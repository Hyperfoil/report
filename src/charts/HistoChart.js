import React, { useState } from 'react';
import {
    Brush,
    Area,
    Label,
    LabelList,
    Legend,
    Cell,
    LineChart,
    BarChart,
    ComposedChart,
    Line,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Text,
    Tooltip,
    ReferenceArea,
    ReferenceLine
} from 'recharts';

import OverloadTooltip from '../components/OverloadTooltip'

export const getHisto = (data, phase, fork = "db", iteration = "all", metric = "test") => {
    const ary = data.phase[phase].iteration[iteration].fork[fork].metric[metric].histogram[0].data;
    const histo = ary.map((entry, index, all) => {
        const rtrn = { ...entry }
        rtrn._bucketCount = index > 0 ? entry['"TotalCount"'] - all[index - 1]['"TotalCount"'] : entry['"TotalCount"']
        rtrn._total = ary[ary.length-1]['"TotalCount"'];
        if (rtrn['"1/(1-Percentile)"'] === "Infinity") {
            return undefined;
        } else {
            return rtrn;
        }
    }).filter(v => v !== undefined);
    return histo
}

export default ({ height, width, data, right = { name: "response time", key: '"Value"', color: "#002F5D" } }) => {
    const tickXform = {}
    data.forEach((entry,entryIndex) => {
        tickXform[entry['"1/(1-Percentile)"']] = entry['"Percentile"']
    })
    const tickFormatter = (v) => {
        if (typeof tickXform[v] !== "undefined") {
            v = tickXform[v]
        }
        return Number(100 * v).toFixed(3)
    }
    const extra = [
        (v)=>({color:"grey",name:"before",value:(v['"TotalCount"']-v._bucketCount)}),
        (v)=>({color:"grey",name:"after",value:(v._total-v['"TotalCount"'])}),
    ]
    return (
        <ComposedChart
            width={width}
            height={height}
            data={data}
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                type="number"
                scale="log"
                domain={['auto', 'auto']} //for use with log
                dataKey='"1/(1-Percentile)"'
                tickFormatter={tickFormatter}
            >
                <Label value="percentile" position="insideBottom" angle={0} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
            </XAxis>
            <YAxis yAxisId={0} orientation="left" >
                <Label value="count" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
            </YAxis>
            <YAxis yAxisId={1} orientation="right"  >
                <Label value="ms" position="insideRight" angle={-90} />
            </YAxis>
            <Line name="requests" yAxisId={0} dataKey='_bucketCount' isAnimationActive={false} fill="#6EC664" stroke="#6EC664" style={{ strokeWidth: 0 }} />
            {/* <Bar name="requests" yAxisId={0} dataKey='_bucketCount' isAnimationActive={false} fill="#6EC664" stroke="#6EC664" style={{ strokeWidth: 0 }} /> */}
            {right ? 
                (<Line name="response time" yAxisId={1} dataKey='"Value"' dot={false} isAnimationActive={false} stroke={right.color} style={{ strokeWidth: 2 }} />) 
                : undefined }            
            <Tooltip content={<OverloadTooltip extra={extra}/>} labelFormatter={tickFormatter} />
        </ComposedChart>
    )
}