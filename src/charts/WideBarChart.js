import React, { useState } from 'react';
import {
    Area,
    Label,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
} from 'recharts';
import { DateTime } from 'luxon';
import OverloadTooltip from '../components/OverloadTooltip'
import theme from '../theme';
const psList = new Set([
    "Requests",
    "Responses",
    "ConnFailure",
    "Reset",
    "Timeouts",
    "2xx",
    "3xx",
    "4xx",
    "5xx",
    "Other",
    "Invalid",
    "BlockedCount",
])

const useZoom = () => {
    const [left, setLeft] = useState(false)
    const [right, setRight] = useState(false)
    return [[left, right], setLeft, setRight];
}

export const getAreaBars = (data) => {
    const areaHeaders = data.header;
    let areaBars = {}
    data.data.forEach((row, rowIndex) => {
        const start = areaBars[row.Start] || { _areaKey: row.Start }
        const end = areaBars[row.End] || { _areaKey: row.End }
        const midIdx = (row.End / 2 + row.Start / 2)
        const mid = areaBars[midIdx] || { _areaKey: midIdx }

        // if(typeof areaBars[row.Start] !== "undefined"){
        //     console.log("already have start",start,row)
        // }
        // if(typeof areaBars[row.End] !== "undefined"){
        //     console.log("already have end",end,row)
        // }
        // if(typeof areaBars[midIdx] !== "undefined"){
        //     console.log("already have mid",mid,row)
        // }


        const key = row.Phase.replace(/\//g, "_") + (typeof row.Name !== "undefined" ? "_" + row.Name : "" ) + (typeof row.Metric !== "undefined" ? "_" + row.Metric : "");

        areaHeaders.forEach((header, headerIndex) => {
            start[key + "_" + header] = row[header]
            end[key + "_" + header] = row[header]
            mid[key + "_" + header] = row[header]
            if (psList.has(header)) {
                const ts = (row.End - row.Start) / 1000;
                start[key + "_" + header + "_ps"] = row[header] / ts
                end[key + "_" + header + "_ps"] = row[header] / ts
                mid[key + "_" + header + "_ps"] = row[header] / ts
            }

        })

        areaBars[row.Start] = start;
        areaBars[row.End] = end;
        areaBars[midIdx] = mid;
    })
    areaBars = Object.values(areaBars).sort((a, b) => a._areaKey - b._areaKey)
    return areaBars
}
//hard coded to ensure the taller bars are painted before (behind) the shorter bars
//not certain on ordering for p50.0 and Mean
const keyOrder = ['p99.999', 'p99.99', 'p99.9', 'p99.0', 'p90.0', 'p50.0', 'Mean'];

export default ({ height, width, data, domain,
    bars = [
        {
            name: "initialRampUp",
            colorGroup: 'purple',
            phases: [{ name: 'initialRampUp_proxy_test', onClick: (e) => { } }],
            stats: ['Mean', 'p90.0', 'p99.0', 'p99.9']
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
    const [zoom, setLeft, setRight] = useZoom();
    const [currentDomain, setDomain] = useState(domain);
    const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
    const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")
    const areas = bars.reduce((rtrn, bar) => {
        const barStats = new Set(bar.stats);
        bar.phases.forEach((phase, phaseIndex) => {
            const phaseName = phase.name;
            const sortedKeys = keyOrder.filter(v => barStats.has(v));
            sortedKeys.forEach((statName, statIndex) => {
                if (barStats.has(statName)) {
                    const colorGroup = theme.colors.chart[bar.colorGroup]
                    const color = colorGroup[statIndex + (colorGroup.length - sortedKeys.length)];
                    rtrn.push(
                        <Area
                            key={phaseName + "_" + statIndex}
                            name={statName}
                            dataKey={phaseName + "_" + statName}
                            stroke={color}
                            unit="ns"
                            fill={color}
                            cursor={phase.onClick !== undefined ? "pointer" : undefined}
                            onClick={phase.onClick || undefined}
                            connectNulls
                            type="monotone"
                            yAxisId={0}
                            isAnimationActive={false}
                        />
                    )

                } else {
                }
            })
        })
        return rtrn
    }, [])
    const legendPayload = bars.map((bar, barIndex) => ({
        color: theme.colors.chart[bar.colorGroup][0],
        fill: theme.colors.chart[bar.colorGroup][0],
        type: 'rect',
        value: bar.name
    })).concat(Object.keys(right).length > 0 ? {
        color: right.color,
        fill: right.color,
        type: 'rect',
        value: right.name
    } : undefined).filter(v => v !== undefined)
    const rightLines = Object.keys(right).length > 0 ? (
        right.phases.map((phaseName, phaseIndex) => {
            const rightKey = phaseName + "_" + right.stat
            return (
            <Line
                key={phaseIndex}
                yAxisId={1}
                name={right.name}
                dataKey={rightKey}
                stroke={right.color}
                fill={right.color}
                connectNulls
                dot={false}
                isAnimationActive={false}
                style={{ strokeWidth: 2 }}
            />
        )})
    ) : undefined;
    return (
        <ComposedChart
            width={width}
            height={height}
            data={data}
            onDoubleClick={e =>{

            }}
            onMouseDown={e => {
                if (e) {
                    setLeft(e.activeLabel);
                    setRight(e.activeLabel)
                }
            }}
            onMouseMove={e => {
                if(zoom[0]){
                    setRight(e.activeLabel)
                }
                return false;
            }}
            onMouseUp={e => {
                if (zoom[0] && zoom[1] && zoom[0] !== zoom[1]) {
                    let newDomain = zoom;
                    if(zoom[0] > zoom[1]){
                        newDomain = [zoom[1],zoom[0]];
                    }
                    setDomain(newDomain);
                }
                setLeft(false);
                setRight(false)
            }}
            style={{ userSelect: 'none' }}
        >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                allowDataOverflow={true}
                type="number"
                scale="time"
                dataKey="_areaKey"
                tickFormatter={tsToHHmmss}
                //domain={domain}
                domain={currentDomain}
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
                content={<OverloadTooltip active={true}/>} labelFormatter={tsToHHmmss}
                //labelFormatter={tsToHHmmss}
                formatter={(e) => Number(e).toFixed(0)}
            />
            <Legend payload={legendPayload} align="left"/>
            <Legend payload={legendPayload} align="right"/>
            {areas}
            {rightLines}
            {zoom[0] && zoom[1] ?
                (<ReferenceArea yAxisId={0} x1={zoom[0]} x2={zoom[1]} strokeOpacity={0.3} />)
                : undefined}

        </ComposedChart>
    )
}