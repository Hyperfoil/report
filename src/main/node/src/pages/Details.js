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
import { buildName } from '../redux/reducers';
import OverloadTooltip from '../components/OverloadTooltip'
import theme from '../theme';

const keyOrder = ['p99.999', 'p99.99', 'p99.9', 'p99.0', 'p90.0', 'p50.0', 'Mean'];
const stats = ['99.99', '99.9', '99.0', '90.0', '50.0', 'Mean'];



const colors = theme.colors.chart
const colorNames = Object.keys(colors);

const getPhases = state => state.data.phase

const phasesTimetable = (metric = {}, stats = [], getStart = v => v.startTime, getEnd = v => v.endTime) => {
    let rtrn = {}
    Object.keys(metric).forEach(phaseName => {
        const phase = metric[phaseName];
        phase.forEach(entry => {
            const start = getStart(entry);
            const end = getEnd(entry);

            const rtrnStart = rtrn[start] || { _areaKey: start }
            const rtrnEnd = rtrn[end] || { _areaKey: end }

            const key = entry._pif;//phaseName

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
            })
            rtrnStart.start = start
            rtrnStart.end = end
            rtrnEnd.start = start
            rtrnEnd.end = end

            rtrn[start] = rtrnStart;
            rtrn[end] = rtrnEnd;

        })
    });
    //sort by the timestamp
    rtrn = Object.values(rtrn).sort((a, b) => a._areaKey - b._areaKey)
    return rtrn
}
const getPhaseTransitionTs = (phases = {}, getStart = (v) => v.startTime, getEnd = v => v.endTime) => {
    const rtrn = []
    Object.keys(phases).forEach(phaseName => {
        const phase = phases[phaseName];
        Object.keys(phase.iteration).forEach(iterationName => {
            const iteration = phase.iteration[iterationName];
            Object.keys(iteration.fork).forEach(forkName => {
                const fork = iteration.fork[forkName]
                Object.keys(fork.metric).forEach(metricName => {
                    const metric = fork.metric[metricName]
                    rtrn.push(getStart(metric.series[0]))
                    rtrn.push(getStart(metric.series[metric.series.length - 1]))
                    rtrn.push(getEnd(metric.series[0]))
                    rtrn.push(getEnd(metric.series[metric.series.length - 1]))
                })
            })
        })
    })
    return [...new Set(rtrn)]
}
const forkMetricPhase = (phases = {}, sortStart = (a, b) => a.startTime - b.startTime) => {
    const rtrn = {}
    const pifs = new Set([]);
    Object.keys(phases).forEach(phaseName => {
        const phase = phases[phaseName];
        Object.keys(phase.iteration).forEach(iterationName => {
            const iteration = phase.iteration[iterationName];
            Object.keys(iteration.fork).forEach(forkName => {
                const fork = iteration.fork[forkName]
                Object.keys(fork.metric).forEach(metricName => {
                    const metric = fork.metric[metricName]
                    if (typeof rtrn[forkName] === "undefined") {
                        rtrn[forkName] = {}
                    }
                    if (typeof rtrn[forkName][metricName] === "undefined") {
                        rtrn[forkName][metricName] = {}
                    }
                    if (typeof rtrn[forkName][metricName][phaseName] === "undefined") {
                        rtrn[forkName][metricName][phaseName] = []
                    }
                    metric.series.forEach(entry => {
                        //TODO set the phase_iter_fork name on the entry so we prerve overlap?
                        entry._pif = buildName(phaseName, iterationName, forkName);
                        pifs.add(entry._pif)
                        rtrn[forkName][metricName][phaseName].push(entry);
                    })
                })
            })
        })
    })
    Object.keys(rtrn).forEach(forkName => {
        const fork = rtrn[forkName]
        Object.keys(fork).forEach(metricName => {
            const metric = fork[metricName];
            Object.keys(metric).forEach(phaseName => {
                const phaseArray = metric[phaseName];
                phaseArray.sort(sortStart);
            })
        })
    })
    return { forkMap: rtrn, phaseIds: [...pifs] };
}

const getForkMap = createSelector(
    getPhases,
    (phases) => forkMetricPhase(phases)
)


const getDomain = (phases) => {
    let rtrn = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    Object.values(phases).forEach(phase => {
        Object.values(phase.iteration).forEach(iteration => {
            Object.values(iteration.fork).forEach(fork => {
                Object.values(fork.metric).forEach(metric => {
                    metric.series.forEach(entry => {
                        if (entry.startTime < rtrn[0]) {
                            rtrn[0] = entry.startTime;
                        }
                        if (entry.endTime > rtrn[1]) {
                            rtrn[1] = entry.endTime;
                        }
                    })
                })

            })
        })
    })
    return rtrn;
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

const makeChart = (forkMap, currentDomain, phaseDomain, phaseIds, zoom, setDomain, phaseTransitionTs) => {
    const sections = [];
    Object.keys(forkMap).forEach(forkName => {
        const fork = forkMap[forkName]
        Object.keys(fork).forEach(metricName => {
            const metric = fork[metricName];

            const phaseNames = [...new Set(
                Object.keys(metric).reduce((rtrn, key) => {
                    rtrn.push(key)
                    return rtrn;
                }, [])
            )]

            phaseNames.sort()

            const timetable = phasesTimetable(
                metric,
                [
                    { name: "99.99", accessor: v => v.percentileResponseTime['99.99'] },
                    { name: "99.9", accessor: v => v.percentileResponseTime['99.9'] },
                    { name: "99.0", accessor: v => v.percentileResponseTime['99.0'] },
                    { name: "90.0", accessor: v => v.percentileResponseTime['90.0'] },
                    { name: "50.0", accessor: v => v.percentileResponseTime['50.0'] },
                    { name: "Mean", accessor: v => v.meanResponseTime },
                    { name: "rps", accessor: v => v.requestCount / ((v.endTime - v.startTime) / 1000) },
                ]
                // ,
                // v=>v.startTime-v.startTime%1000 , 
                // v=>v.endTime-v.endTime%1000
            ).filter(v =>
                (v.start <= currentDomain[1] && v.start >= currentDomain[0]) ||
                (v.end >= currentDomain[0] && v.end <= currentDomain[1])
            )


            console.log("timetable", timetable);
            console.log("phaseIds", phaseIds);


            let colorIndex = -1;
            const areas = [];
            const rightLines = [];
            const legendPayload = []

            phaseNames.forEach((phaseName, phaseIndex, phaseNames) => {
                colorIndex++;
                if (colorIndex >= colorNames.length) {
                    colorIndex = 0;
                }
                const pallet = colors[colorNames[colorIndex]];

                phaseIds.filter(phaseId => phaseId.startsWith(phaseName)).forEach(phaseId => {

                    stats.forEach((statName, statIndex) => {
                        const color = pallet[statIndex % pallet.length]
                        areas.push(
                            <Area
                                key={phaseId + "_" + statName}
                                name={statName}
                                dataKey={phaseId + "_" + statName}
                                stroke={color}
                                unit="ns"
                                fill={color}
                                connectNulls={true} //needs to be true for cases of overlap
                                type="monotone"
                                yAxisId={0}
                                isAnimationActive={false}
                                style={{ opacity: 0.5 }}
                            />
                        )
                    })
                    rightLines.push(
                        <Line
                            key={phaseId + "_rps"}
                            yAxisId={1}
                            name={"Requests/s"}
                            dataKey={phaseId + "_rps"}
                            stroke={"#A30000"}
                            fill={"#A30000"}
                            connectNulls={true}
                            dot={false}
                            isAnimationActive={false}
                            style={{ strokeWidth: 1 }}
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
            ]
            sections.push(
                <PageSection key={forkName + "." + metricName}>
                    <Card style={{ pageBreakInside: 'avoid' }}>
                        <CardHeader>
                            <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                                <ToolbarGroup><ToolbarItem>{`${forkName === ":DEFAULT:" ? "" : forkName} ${metricName === ":DEFAULT:" ? "" : metricName} response times`}</ToolbarItem></ToolbarGroup>
                            </Toolbar>
                        </CardHeader>
                        <CardBody style={{ minHeight: 400 }} onDoubleClick={e => {
                            setDomain(phaseDomain);
                        }}>
                            <AutoSizer>{({ height, width }) => {
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
                                        <YAxis yAxisId={0} orientation="left" tickFormatter={nanoToMs} domain={['auto', 'auto']}>
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
                                        {zoom.left && zoom.right ?
                                            (<ReferenceArea yAxisId={0} x1={zoom.left} x2={zoom.right} strokeOpacity={0.3} />)
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
}
export default () => {

    const phases = useSelector(state => state.data.phase)

    const { forkMap, phaseIds } = useSelector(getForkMap)

    const phaseDomain = getDomain(phases);

    const zoom = useZoom();

    const [currentDomain, setDomain] = useState(phaseDomain);

    const phaseTransitionTs = getPhaseTransitionTs(phases
        // , v=>v.startTime-v.startTime%1000 
        // , v=>v.endTime-v.endTime%1000
    ).filter(v => v > currentDomain[0] && v < currentDomain[1]);

    const sections = useMemo(
        ()=>makeChart(forkMap, currentDomain, phaseDomain, phaseIds, zoom, setDomain, phaseTransitionTs),
        [forkMap, currentDomain, phaseDomain, phaseIds, zoom, setDomain, phaseTransitionTs]
    );
    return (
        <React.Fragment>{sections}</React.Fragment>
    )
}