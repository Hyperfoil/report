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

import {
    getInfo,
    getStats,
    getForkMetricMap, 
    getAllTotals, 
    getAllFailures, 
    getAllPhaseNames,
    getAllForkNames,
    getAllMetricNames,
    getDomain,
} from '../redux/selectors';
import OverloadTooltip from '../components/OverloadTooltip'
import theme from '../theme';

const domainSelector = createSelector(
    getStats(),
    getDomain
);


//creates a sorted array of {[phase.metric_stat]:value} for use in rechart Area's in WideChart
const phaseTimetable = (data = [], stats = [], getStart = v => v.start, getEnd = v => v.end, getKey = v => v.phase + "." + v.metric) => {
    let rtrn = {}
    data.forEach((entry, entryIndex) => {
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

//const stats = ['99.9', '99.0', '90.0', '50.0', 'Mean'];

const useZoom = () => {
    const [left, setLeft] = useState(false)
    const [right, setRight] = useState(false)
    return [[left, right], setLeft, setRight];
}
const colors = theme.colors.chart
const colorNames = Object.keys(colors);


export default () => {
    const stats = useSelector(getStats());
    //const data = useSelector(getData);
    const total = stats.map(v=>v.total);
    const failures = useSelector(getAllFailures)
    const info = useSelector(getInfo)

    const forkNames = useSelector(getAllForkNames);
    const metricNames = useSelector(getAllMetricNames);

    const forkMap = useSelector(getForkMetricMap());
    const domain = [
        Math.min(...total.map(v => v.start || 0)),
        Math.max(...total.map(v => v.end || 0))
    ]
    console.log("domain",domain)
    const history = useHistory();
    const [zoom, setLeft, setRight] = useZoom();

    const fullDomain = useSelector(domainSelector);
    const [currentDomain, setDomain] = useState(fullDomain);


    console.log("currentDomain",currentDomain)

    const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
    const tsToHHmmss = (v) => v ? DateTime.fromMillis(v).toFormat("HH:mm:ss") : ""

    const statAccessors = [
        { name: "99.9", accessor: v => v.summary.percentileResponseTime['99.9'] },
        { name: "99.0", accessor: v => v.summary.percentileResponseTime['99.0'] },
        { name: "90.0", accessor: v => v.summary.percentileResponseTime['90.0'] },
        { name: "50.0", accessor: v => v.summary.percentileResponseTime['50.0'] },
        { name: "Mean", accessor: v => v.summary.meanResponseTime },
        { name: "rps", accessor: v => v.summary.requestCount / ((v.end - v.start) / 1000) },
    ]
    const statAccessorLeftNames = statAccessors
        .map(v => typeof v === "string" ? v : v.name)
        .filter(v=>v!=="rps")

    const codeAccessors = [
        { name: "2xx", accessor: v => v.summary.status_2xx},
        { name: "3xx", accessor: v => v.summary.status_3xx},
        { name: "4xx", accessor: v => v.summary.status_4xx},
        { name: "5xx", accessor: v => v.summary.status_5xx}        
    ]

    const sections = useMemo(()=>{
        if(currentDomain[0] !== fullDomain[0] || currentDomain[1] !== fullDomain[1]){
            setDomain(fullDomain)
        }
        const rtrn = []
        forkNames.forEach(forkName=>{
            metricNames.forEach(metricName=>{
                const forkMetric_stats = stats.filter(v=>v.fork === forkName && v.metric === metricName)
                const phaseNames = [... new Set(forkMetric_stats.map(v=>v.phase))]
                phaseNames.sort();
                
                if(forkMetric_stats.length > 0){
                    //const phaseIds = [... new Set(forkMetric_stats.map(v=>v.name))]
                    const totals = forkMetric_stats.map(v=>v.total)
                    const chartStatTable = phaseTimetable(
                        totals,
                        statAccessors
                    )
                    console.log({forkName,metricName,totals,chartStatTable})

                    let colorIndex = -1;
                    const areas = []
                    const rightLines = []
                    const legendPayload = []
                    phaseNames.forEach((phaseName)=>{
                        colorIndex++;
                        if(colorIndex >= colorNames.length){
                            colorIndex = 0;
                        }
                        const pallet = colors[colorNames[colorIndex]];
                        const phaseStats = forkMetric_stats.filter(v=>v.phase === phaseName)
                        phaseStats.forEach(phase => {
                            statAccessorLeftNames.forEach((statName,statIndex) => {
                                const color = pallet[statIndex % pallet.length]
                                const key = `${phase.name}.${metricName}_${statName}`
                                console.log("Area key",key)
                                areas.push(
                                    <Area
                                        key={key}
                                        dataKey={key}
                                        name={statName}
                                        stroke={color}
                                        unit="ns"
                                        fill={color}
                                        cursor={"pointer"}
                                        onClick={e=>history.push(`/phase/${phase.phase}`)}
                                        connectNulls
                                        type="monotone"
                                        yAxisId={0}
                                        isAnimationActive={false}
                                    />
                                )
                            })
                            rightLines.push(
                                <Line
                                    key={`${phase.name}.${metricName}_rps`}
                                    yAxisId={1}
                                    name="Requests/s"
                                    dataKey={`${phase.name}.${metricName}_rps`}
                                    stroke={"#A30000"}
                                    fill={"#A30000"}
                                    connectNulls={true}
                                    dot={false}
                                    isAnimationActive={false}
                                    style={{ strokeWidth: 2 }}
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
                        color: '#A30000',
                        fill: '#A30000',
                        type: 'rect',
                        value: "Requests/s"
                    })

                    const tooltipExtra = [
                        (v) => {
                            const duration = (v.end - v.start) / 1000
                            return {
                                color: 'grey',
                                name: 'duration',
                                value: duration,
                                unit: 's'
                            }
                        }
                    ]

                    rtrn.push(
                        <React.Fragment key={`${forkName}.${metricName}`}>
                            <PageSection>
                                <Card style={{ pageBreakInside: 'avoid' }}>
                                    <CardHeader>
                                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                                            <ToolbarGroup><ToolbarItem>{`${forkName} ${metricName} response times`}</ToolbarItem></ToolbarGroup>
                                        </Toolbar>
                                    </CardHeader>
                                    <CardBody style={{ minHeight: 400 }}>
                                        <AutoSizer>{({ height, width }) => (
                                            <ComposedChart
                                                width={width}
                                                height={height}
                                                data={chartStatTable}
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
                                        )}</AutoSizer>
                                    </CardBody>
                                </Card>
                            </PageSection>
                        </React.Fragment>
                    )
                }
            })
        })
        return rtrn;
    },[stats,forkNames,metricNames,statAccessors,currentDomain,setDomain])

    const [sectionState, setSectionState] = useState(() => {
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
                const filteredTotals = stats.filter(v => phases.has(v.phase)).map(v=>v.total);
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
                            const key = `${phase.name}.${metricName}_${statName}`
                            console.log("statName",statName)
                            areas.push(
                                <Area
                                    key={key}
                                    name={statName}
                                    dataKey={key} //TODO create fn to share with phaseTimetable(getKey)
                                    stroke={color}
                                    unit="ns"
                                    fill={color}
                                    cursor={"pointer"}
                                    onClick={(e) => { history.push('/phase/' + phase.phase.replace(/\//g, "_")) }}
                                    connectNulls
                                    type="monotone"
                                    yAxisId={0}
                                    isAnimationActive={false}
                                />
                            )
                        })
                        rightLines.push(
                            <Line
                                key={phase.name + "." + metricName + "_rps"} //has to be unique or it is ignored by recharts
                                yAxisId={1}
                                name={"Requests/s"}
                                dataKey={phase.name + "." + metricName + "_rps"}
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
            <PageSection>
                <Card>
                    <CardBody>
                        <div className="pf-c-content">
                            <dl>
                                <dt>benchmark</dt><dd>{info.benchmark}</dd>
                                {info.description ? (<React.Fragment><dt>description</dt><dd>{info.description}</dd></React.Fragment>) : null}
                                <dt>id</dt><dd>{info.id}</dd>
                                <dt>start</dt><dd>{tsToHHmmss(info.startTime)}</dd>
                                <dt>end</dt><dd>{tsToHHmmss(info.terminateTime)}</dd>
                            </dl>
                        </div>
                    </CardBody>
                </Card>
            </PageSection>
            {failures.length > 0 ? (
                <PageSection>
                    {failures.map((failure, failureIndex) => {
                        return (
                            <div key={`failure.${failureIndex}`} className="pf-c-alert pf-m-danger pf-m-inline" aria-label="Inline danger alert">
                                <div className="pf-c-alert__icon">
                                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                                </div>
                                <h4 className="pf-c-alert__title">
                                    <span className="pf-screen-reader">SLA Failure</span>SLA Failure: {failure.phase} {failure.metric}</h4>
                                <div className="pf-c-alert__description">
                                    <p>{failure.message}</p>
                                </div>
                            </div>
                        )
                    })}
                </PageSection>
            ) : null}
            {sections}
        </React.Fragment>
    )
}