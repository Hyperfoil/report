import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux'
import { useHistory, useParams } from "react-router"
import { createSelector } from 'reselect'
import {
    Card,
    CardHeader,
    CardBody,
    PageSection,
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

import {splitName} from '../redux/reducers';
import OverloadTooltip from '../components/OverloadTooltip'
import theme from '../theme';

const getPhases = state => state.data.total.map(v => v.phase)
const getMetrics = state => [...new Set(state.data.total.map(v => v.metric))]

const buildName = (phase, iteration, fork) => {
    var rtrn = phase;
    if (!iteration.equals(":DEFAULT:")) {
        rtrn = rtrn + "/" + iteration;
    }
    if (!fork.equals(":DEFAULT:")) {
        rtrn = rtrn + "/" + fork;
    }
    return rtrn;
}

//creates a sorted array of {[phase.metric_stat]:value} for use in rechart Area's in WideChart
const phaseTimetable = (total = [], stats = [], getStart = v => v.start, getEnd = v => v.end, getKey = v => v.phase + "." + v.metric) => {
    let rtrn = {}
    total.forEach((entry, entryIndex) => {
        const start = getStart(entry);
        const end = getEnd(entry);
        const mid = (end / 2 + start / 2)

        const rtrnStart = rtrn[start] || { _areaKey: start }
        const rtrnEnd = rtrn[end] || { _areaKey: end }
        const rtrnMid = rtrn[mid] || { _areaKey: mid }

        const key = getKey(entry);

        stats.forEach((statName, statIndex) => {
            let statKey, statValue
            if (typeof statName === "string") {
                statKey = key + "_" + statName;
                statValue = entry[statName];
            } else {
                statKey = key + "_" + statName.name;
                statValue = statName.accessor(entry)
            }
            rtrnStart[statKey] = statValue
            rtrnEnd[statKey] = statValue
            rtrnMid[statKey] = statValue
        })
        rtrnStart.start = start
        rtrnStart.end = end
        rtrnEnd.start = start
        rtrnEnd.end = end
        rtrnMid.start = start
        rtrnMid.end = end

        rtrn[start] = rtrnStart;
        rtrn[end] = rtrnEnd;
        rtrn[mid] = rtrnMid;
    })
    //sort by the timestamp
    rtrn = Object.values(rtrn).sort((a, b) => a._areaKey - b._areaKey)
    return rtrn
}
//converts array with phaseNames to forkName.metricName = []
const forkMetricPhaseTotals = (total = [], splitName = (name) => ({ phase: "", iteration: "", fork: "" }), getStart = (a, b) => a.start - b.start) => {
    const rtrn = {}
    total.forEach(entry => {
        const split = splitName(entry.phase);
        if (typeof rtrn[split.fork] === "undefined") {
            rtrn[split.fork] = {}
        }
        if (typeof rtrn[split.fork][entry.metric] === "undefined") {
            rtrn[split.fork][entry.metric] = {};
        }
        if (typeof rtrn[split.fork][entry.metric][split.phase] === "undefined") {
            rtrn[split.fork][entry.metric][split.phase] = []
        }
        rtrn[split.fork][entry.metric][split.phase].push(entry)
    })
    Object.keys(rtrn).forEach(forkName => {
        const fork = rtrn[forkName]
        Object.keys(fork).forEach(metricName => {
            const metric = fork[metricName];
            Object.keys(metric).forEach(phaseName => {
                const phaseArray = metric[phaseName];
                phaseArray.sort(getStart);
            })
        })
    })
    return rtrn;
}

const keyOrder = ['p99.999', 'p99.99', 'p99.9', 'p99.0', 'p90.0', 'p50.0', 'Mean'];
const stats = ['99.9', '99.0', '90.0', '50.0', 'Mean'];

const useZoom = () => {
    const [left, setLeft] = useState(false)
    const [right, setRight] = useState(false)
    return [[left, right], setLeft, setRight];
}
const colors = theme.colors.chart
const colorNames = Object.keys(colors);

const getTotal = state=>state.data.total
const makeForkMapper = (splitName)=>createSelector(
    getTotal,
    (total)=>forkMetricPhaseTotals(total,splitName)
)
const getForkMap = makeForkMapper(splitName);

const getSection = createSelector(
    [getTotal,makeForkMapper(splitName)],
    (total,forkMap)=>{
        return []
    }
)

export default () => {
    const total = useSelector(getTotal)
    const forkMap = useSelector(getForkMap);

    const domain = [
        Math.min(...total.map(v => v.start)),
        Math.max(...total.map(v => v.end))
    ]
    const history = useHistory();
    const [zoom, setLeft, setRight] = useZoom();
    const [currentDomain, setDomain] = useState(domain);

    const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
    const tsToHHmmss = (v) => DateTime.fromMillis(v).toFormat("HH:mm:ss")

    const [sectionState,setSectionState] = useState(()=>{
        const sections = [];
        Object.keys(forkMap).forEach(forkName => {
            const fork = forkMap[forkName]
            Object.keys(fork).forEach(metricName => {
                const metric = fork[metricName];
    
                const phases = new Set(
                    Object.values(metric).reduce((rtrn, array) => {
                        array.map(v => v.phase).forEach(n => rtrn.push(n));
                        return rtrn;
                    }, [])
                )
    
                const filteredTotals = total.filter(v => phases.has(v.phase));
    
                const filteredPhaseTimes = phaseTimetable(
                    filteredTotals,
                    [
                        { name: "99.9", accessor: v => v.summary.percentileResponseTime['99.9'] },
                        { name: "99.0", accessor: v => v.summary.percentileResponseTime['99.0'] },
                        { name: "90.0", accessor: v => v.summary.percentileResponseTime['90.0'] },
                        { name: "50.0", accessor: v => v.summary.percentileResponseTime['50.0'] },
                        { name: "Mean", accessor: v => v.summary.meanResponseTime },
                        { name: "rps", accessor: v => v.summary.requestCount / ((v.end - v.start) / 1000) },
                    ]
                )
    
                let colorIndex = -1;
                const areas = [];
                const rightLines = [];
                const legendPayload = []

                const phaseNames = [...Object.keys(metric)];
                phaseNames.sort();

                phaseNames.forEach((phaseName, phaseIndex, phaseNames) => {
                    colorIndex++;
                    if (colorIndex >= colorNames.length) {
                        colorIndex = 0;
                    }
                    const pallet = colors[colorNames[colorIndex]];
                    const phaseArray = metric[phaseName];
                    
                    phaseArray.forEach(phase => {
                        stats.forEach((statName, statIndex) => {
                            const color = pallet[statIndex % pallet.length]
                            areas.push(
                                <Area
                                    key={phase.phase + "." + metricName + "_" + statName}
                                    name={statName}
                                    dataKey={phase.phase + "." + metricName + "_" + statName} //TODO create fn to share with phaseTimetable(getKey)
                                    stroke={color}
                                    unit="ns"
                                    fill={color}
                                    cursor={"pointer"}
                                    onClick={(e) => { history.push('/phase/'+phase.phase.replace(/\//g, "_"))}}
                                    connectNulls
                                    type="monotone"
                                    yAxisId={0}
                                    isAnimationActive={false}
                                />
                            )
                        })
                        rightLines.push(
                            <Line
                                key={phase.phase + "." + metricName + "_rps"} //has to be unique or it is ignored by recharts
                                yAxisId={1}
                                name={"Requests/s"}
                                dataKey={phase.phase + "." + metricName + "_rps"}
                                stroke={"#A30000"}
                                fill={"#A30000"}
                                connectNulls={true}
                                dot={false}
                                isAnimationActive={false}
                                style={{ strokeWidth: 2 }}
                            />
                        )
                    })
                    legendPayload.push(
                        {
                            color: pallet[0],
                            fill: pallet[0],
                            type: 'rect',
                            value: phaseName
                        }
                    )
                })
                legendPayload.push(
                    {
                        color: '#A30000',
                        fill: '#A30000',
                        type: 'rect',
                        value: 'Requests/s'
                    }
                )
                const tooltipExtra = [
                    (v) => {
                        const duration = (v.end - v.start) / 1000
                        return {
                            color: "grey",
                            name: "duration",
                            value: duration,
                            unit: 's'
                        }
                    }
                ]
                sections.push(
                    <PageSection key={forkName + "." + metricName}>
                        <Card style={{ pageBreakInside: 'avoid' }}>
                            <CardHeader>
                                <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                                    <ToolbarGroup><ToolbarItem>{`${forkName === ":DEFAULT:" ? "" : forkName} ${metricName === ":DEFAULT:" ? "" : metricName} response times`}</ToolbarItem></ToolbarGroup>
                                </Toolbar>
                            </CardHeader>
                            <CardBody style={{ minHeight: 400 }}>
                                <AutoSizer>{({ height, width }) => {
                                    return (
                                        <ComposedChart
                                            width={width}
                                            height={height}
                                            data={filteredPhaseTimes}
                                            onMouseDown={e => {
                                                if (e) {
                                                    setLeft(e.activeLabel);
                                                    setRight(e.activeLabel)
                                                }
                                            }}
                                            onMouseMove={e => {
                                                if (zoom[0]) {
                                                    setRight(e.activeLabel)
                                                }
                                                return false;
                                            }}
                                            onMouseUp={e => {
                                                if (zoom[0] && zoom[1] && zoom[0] !== zoom[1]) {
                                                    let newDomain = zoom;
                                                    if (zoom[0] > zoom[1]) {
                                                        newDomain = [zoom[1], zoom[0]];
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
                                            <YAxis yAxisId={1} orientation="right" style={{ fill: '#A30000' }}>
                                                <Label value={"Requests/s"} position="insideRight" angle={-90} style={{ fill: '#A30000' }} />
                                                {/* <Label value="requests" position="top" angle={0} textAnchor='end' style={{ textAnchor: 'end' }} /> */}
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
                                            {zoom[0] && zoom[1] ?
                                                (<ReferenceArea yAxisId={0} x1={zoom[0]} x2={zoom[1]} strokeOpacity={0.3} />)
                                                : undefined
                                            }
                                        </ComposedChart>
                                    )
                                }}</AutoSizer>
                            </CardBody>
                        </Card>
                    </PageSection>
                )
            })
        })
    
        return sections;

    })
    return (
        <React.Fragment>
            {sectionState}
        </React.Fragment>
    )
}