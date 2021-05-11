import React, { useState } from 'react';
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import {
    Card,
    CardHeader,
    CardBody,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
} from '@patternfly/react-core';
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
import { AutoSizer } from 'react-virtualized';
import { DateTime } from 'luxon';
import { useParams } from "react-router"
import OverloadTooltip from '../components/OverloadTooltip'
import theme from '../theme';
import {
   percentileAccessors,
   percentiles,
} from './accessors'
import StatsTable from '../components/StatsTable'

import {
    getDomain,
    getStats,
    getAllForkNames,
    getAllMetricNames,
    getAllTotals,
} from '../redux/selectors';

const statAccessors = [
   ...percentileAccessors,
   { name: "Mean", accessor: v => v.meanResponseTime },
   // We don't divide the request count by duration since the union interval from different agents
   // is often > 1000 ms while we know that on each agent the stats have been collected for only 1 second
   { name: "rps", accessor: v => v.requestCount },
   { name: "eps", accessor: v => (v.extensions.http ? v.extensions.http.status_5xx + v.extensions.http.status_4xx + v.extensions.http.status_other : 0) + v.connectionErrors + v.requestTimeouts},
]

const colors = theme.colors.chart
const colorNames = Object.keys(colors);

const phasesTimetable = (data = [], stats = [], getStart = v => v.startTime, getEnd = v => v.endTime, getKey = v=>v._pif) => {
    let rtrn = {}
    // In runs with multiple agents the wall-clock timestamps often don't match exactly; while merging the stats
    // each interval is an union of the agents' intervals and therefore the per-second intervals overlap.
    // That would mess up charts, producing a sawtooth-like pattern instead of bars, so we have to artificially correct it.
    let ends = {}
    data.forEach(entry => {
        const key = getKey(entry)
        let phaseEnds = ends[key]
        if (!phaseEnds) {
            ends[key] = phaseEnds = []
        }
        phaseEnds.push(getEnd(entry))
    })
    Object.values(ends).forEach(phaseEnds => phaseEnds.sort())
    data.forEach(entry => {
        const key = getKey(entry);//phaseName

        let start = getStart(entry);
        const end = getEnd(entry);
        const prevEndIndex = ends[key].filter(e => e < end).length - 1
        if (prevEndIndex >= 0 && ends[key][prevEndIndex] >= start) {
            start = ends[key][prevEndIndex] + 1
        }

        const rtrnStart = rtrn[start] || { _areaKey: start }
        const rtrnEnd = rtrn[end] || { _areaKey: end }

        stats.forEach(stat => {
            const statKey = key + "_" + stat.name;
            const statValue = stat.accessor(entry)
            rtrnStart[statKey] = statValue
            rtrnEnd[statKey] = statValue
        })
        rtrnStart.start = start
        rtrnStart.end = end
        rtrnEnd.start = start
        rtrnEnd.end = end

        rtrn[start] = rtrnStart;
        rtrn[end] = rtrnEnd;
    })
    //sort by the timestamp
    rtrn = Object.values(rtrn).sort((a, b) => a._areaKey - b._areaKey)
    return rtrn
}
const getPhaseTransitionTs = (data = [], getStart = (v) => v.startTime, getEnd = v => v.endTime) => {
    const rtrn = []
    data.forEach(entry=>{
        rtrn.push(getStart(entry.series[0]))
        rtrn.push(getStart(entry.series[entry.series.length - 1]))
        rtrn.push(getEnd(entry.series[0]))
        rtrn.push(getEnd(entry.series[entry.series.length - 1]))
    })
    return [...new Set(rtrn)]
}

const useZoom = () => {
    const [left, setLeft] = useState(false)
    const [right, setRight] = useState(false)
    return {
        left,
        right,
        setLeft,
        setRight,
    };
}

const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")

const domainSelector = createSelector(
    getStats(),
    getDomain
);

function Section({ forkName, metricName }) {
    const stats = useSelector(getStats());
    const fullDomain = useSelector(domainSelector);
    const [currentDomain, setDomain] = useState(fullDomain);

    const zoom = useZoom();

    const phaseTransitionTs = getPhaseTransitionTs(stats
        ).filter(v => v > currentDomain[0] && v < currentDomain[1]);

    const forkMetric_stats = stats.filter(v => (!forkName || v.fork === forkName) && v.metric === metricName)

    const maxResponseTimes = forkMetric_stats.map(v => v.total.summary.percentileResponseTime["99.9"]).sort((a, b) => a - b)
    // We need to use functional range to reduce the domain below dataMax
    const responseTimeDomain = [0, dataMax => maxResponseTimes[Math.floor(maxResponseTimes.length * 0.8)] * 2]

    const phaseNames = [...new Set(forkMetric_stats.map(v=>v.phase))]
    phaseNames.sort()
    const series = forkMetric_stats.flatMap(v=>v.series.map(entry=>{
        entry._pif = v.name
        return entry;
    }))

    if (series.length === 0){
        return "No data for fork " + forkName + " and metric " + metricName
    }
    const phaseIds = [...new Set(series.map(v=>v._pif))]

    const timetable = phasesTimetable(
        series,
        statAccessors
    )
    .filter(v =>
        (v.start <= currentDomain[1] && v.start >= currentDomain[0]) ||
        (v.end >= currentDomain[0] && v.end <= currentDomain[1])
    )

    let colorIndex = -1;
    const areas = [];
    const rightLines = [];
    const legendPayload = []
    const tooltipExtra = []

    phaseNames.forEach((phaseName,phaseIndex)=>{
        colorIndex++;
        if(colorIndex >= colorNames.length){
            colorIndex = 0;
        }
        const pallet = colors[colorNames[colorIndex]];

        phaseIds.filter(phaseId=>phaseId.startsWith(phaseName)).forEach(phaseId =>{
            percentiles.forEach((statName,statIndex)=>{
                const color = pallet[statIndex % pallet.length]
                areas.push(
                    <Area
                        key={`${phaseId}_${statName}`}
                        name={statName}
                        dataKey={`${phaseId}_${statName}`}
                        stroke={color}
                        unit="ns"
                        fill={color}
                        connectNulls={true} //needs to be true for cases of overlap betweeen phases
                        type="monotone"
                        yAxisId={0}
                        isAnimationActive={false}
                        style={{ opacity: 0.5 }}
                    />
                )
            })
            rightLines.push(
                <Line
                    key={`${phaseId}_Mean`}
                    unit="ns"
                    yAxisId={0}
                    name={"Mean"}
                    dataKey={`${phaseId}_Mean`}
                    stroke={"#FF0000"}
                    fill={"#FF0000"}
                    connectNulls={true}
                    dot={false}
                    isAnimationActive={false}
                    style={{ strokeWidth: 1 }}
                />
            )
            rightLines.push(
                <Line
                    key={`${phaseId}_rps`}
                    yAxisId={1}
                    name={"Requests/s"}
                    dataKey={`${phaseId}_rps`}
                    stroke={"#00A300"}
                    fill={"#00A300"}
                    connectNulls={true}
                    dot={false}
                    isAnimationActive={false}
                    style={{ strokeWidth: 1 }}
                />
            )
            rightLines.push(
                <Line
                        key={`${phaseId}_eps`}
                        yAxisId={2}
                        name={"Errors/s"}
                        dataKey={`${phaseId}_eps`}
                        stroke={"#A30000"}
                        fill={"#A30000"}
                        connectNulls={true}
                        dot={false}
                        isAnimationActive={false}
                        style={{ strokeWidth: 1 }}
                />
            )
        })
        legendPayload.push({
            color: pallet[0],
            fill: pallet[0],
            type: 'rect',
            value: phaseName
        })
    })
    legendPayload.push({
        color: '#FF0000',
        fill: '#FF0000',
        type: 'rect',
        value: "Mean"
    })
    legendPayload.push({
        color: '#00A300',
        fill: '#00A300',
        type: 'rect',
        value: "Requests/s"
    })
    legendPayload.push({
        color: '#A30000',
        fill: '#A30000',
        type: 'rect',
        value: "Errors/s"
    })
    return (
        <React.Fragment key={`${forkName}.${metricName}`}>
            <Card style={{ pageBreakInside: 'avoid'}}>
                <CardHeader>
                    <Toolbar className="">
                        <ToolbarGroup>
                            <ToolbarItem>
                                {`${forkName} ${metricName} response times`}
                            </ToolbarItem>
                        </ToolbarGroup>
                    </Toolbar>
                </CardHeader>
                <CardBody style={{ minHeight: 400 }} onDoubleClick={ e => {
                    setDomain(fullDomain)
                }}>
                    <AutoSizer>{({height, width}) =>{
                        return (
                            <ComposedChart
                                width={width}
                                height={height}
                                data={timetable}
                                onMouseDown={e => {
                                    if (e) {
                                        zoom.setLeft(e.activeLabel);
                                        zoom.setRight(e.activeLabel)

                                        if (e.stopPropagation) e.stopPropagation();
                                        if (e.preventDefault) e.preventDefault();
                                        e.cancelBubble = true;
                                        e.returnValue = false;
                                        return false;
                                    }
                                    return false;
                                }}
                                onMouseMove={e => {
                                    if (zoom.left) {
                                        const r = e.activeLabel ?
                                            e.activeLabel :
                                            zoom.right > zoom.left ?
                                                currentDomain[1] :
                                                currentDomain[0]
                                        zoom.setRight(r)
                                    }
                                    return false;
                                }}
                                onMouseUp={e => {
                                    if (zoom.left && zoom.right && zoom.left !== zoom.right) {
                                        let newDomain = [zoom.left, zoom.right];
                                        if (zoom.left > zoom.right) {
                                            newDomain = [zoom.right, zoom.left];
                                        }
                                        setDomain(newDomain);
                                    }
                                    zoom.setLeft(false);
                                    zoom.setRight(false)
                                }}

                                style={{ userSelect: 'none' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    allowDataOverflow={true}
                                    type="number"
                                    scale="time"
                                    dataKey="_areaKey"
                                    ticks={phaseTransitionTs}
                                    tickFormatter={tsToHHmmss}
                                    //domain={domain}
                                    domain={currentDomain}
                                />
                                <YAxis yAxisId={0} orientation="left" tickFormatter={nanoToMs} domain={responseTimeDomain}>
                                    <Label value="response time" position="insideLeft" angle={-90} style={{ textAnchor: 'middle' }}/>
                                </YAxis>
                                <YAxis yAxisId={1} orientation="right">
                                    <Label value="requests/s" position="insideRight" angle={-90} style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <YAxis yAxisId={2} orientation="right">
                                    <Label value="errors/s" position="insideRight" angle={-90} style={{ textAnchor: 'middle' }} />
                                </YAxis>
                                <Tooltip
                                    content={
                                        <OverloadTooltip
                                            active={true}
                                            extra={tooltipExtra}
                                        />
                                    }
                                    labelFormatter={tsToHHmmss}
                                    formatter={(e) => Number(e).toFixed(0)}
                                />
                                <Legend payload={legendPayload} align="left" />

                                {areas}
                                {rightLines}
                                {zoom.left && zoom.right ?
                                    (<ReferenceArea yAxisId={0} x1={zoom.left} x2={zoom.right} strokeOpacity={0.3} />)
                                    : undefined
                                }
                            </ComposedChart>
                        )
                    }}</AutoSizer>
                </CardBody>
            </Card>
        </React.Fragment>
    )
}

export function Metric() {
    const params = useParams()
    return <Section forkName={ params.fork || "" } metricName={params.metric} />
}

export default () => {
    const forkNames = useSelector(getAllForkNames);
    const metricNames = useSelector(getAllMetricNames);
    const allTotals = useSelector(getAllTotals)

    return (<>
        {forkNames.flatMap(forkName => metricNames.map(metricName => (
            <Section
                key={ forkName + "_" + metricName }
                forkName={ forkName }
                metricName={ metricName }
            />
        )))}
        <br />
        <Card>
            <CardBody>
                <StatsTable data={allTotals} />
            </CardBody>
        </Card>
    </>)
}