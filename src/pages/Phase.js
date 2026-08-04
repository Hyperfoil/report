import React, { useMemo } from 'react';
import { useSelector } from 'react-redux'

import { useParams } from "react-router"

import {
    Card,
    CardHeader,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
    CardBody,
    Title
} from '@patternfly/react-core';
import {
    Label,
    ComposedChart,
    Line,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';

import { AutoSizer } from 'react-virtualized';

import StatsTable from '../components/StatsTable'
import OverloadTooltip from '../components/OverloadTooltip'

import {
    getStats,
} from '../redux/selectors';

export default () => {
    let { phaseId } = useParams();
    const stats = useSelector(getStats({name:phaseId}));
    const totals = useMemo(() => stats.map(v => v.total), [stats])

    const segments = []
    stats.forEach(stat=>{

        const responsetimeHisto = stat.histogram.linear.map((entry, index, all)=>{
            entry.value = Math.round(entry.to / 1000000);
            return entry;
        }).filter(v => v !== undefined).filter(v => v.percentile <= 0.95);

        stat.histogram.percentiles.sort((a,b)=>a.percentile-b.percentile)
        const percentileHisto = stat.histogram.percentiles.map((entry, index, all)=>{
            const rtrn = { ...entry }
            rtrn._bucketCount = index > 0 ? entry.totalCount - all[index - 1].totalCount : entry.totalCount
            rtrn._total = all[all.length - 1].totalCount;
            rtrn.value = entry.to / 1000000

            if (rtrn.percentile === 1) {
                // Give 100% a safe "inversed" value so it doesn't calculate Infinity.
                // We place it one logarithmic step (x10) past the previous maximum point.
                const prev = all[index - 1];
                rtrn.inversed = prev && prev.percentile !== 1 ? (1 / (1 - prev.percentile)) * 10 : 100000;
                return rtrn;
            } else {
                rtrn.inversed = (1 / (1 - rtrn.percentile))
                return rtrn;
            }
        }).filter(v => v !== undefined);
        percentileHisto.sort((a,b)=>a.inversed - b.inversed);


        const tickTransform = {}
        const ranges = {}
        percentileHisto.forEach((entry,idx,all)=>{
            tickTransform[entry.inversed] = entry.percentile
            ranges[entry.count] = (idx>0 ? all[idx-1].count : 0)
        })

        // Reusable formatter for dynamic decimal precision
        const formatPercentValue = (v) => {
            if (v === 1) return "100%";
            const percent = 100 * v;

            if (v >= 0.999999) return percent.toFixed(6) + "%";
            if (v >= 0.99999) return percent.toFixed(5) + "%";
            if (v >= 0.9999) return percent.toFixed(4) + "%";
            if (v >= 0.999) return percent.toFixed(3) + "%";

            return percent.toFixed(2) + "%";
        };

        const tickFormatter = (v) => {
            if (typeof tickTransform[v] !== "undefined") {
                v = tickTransform[v]
            }
            return formatPercentValue(v);
        }

        const responsetimeTickFormatter = (v,f,g) => {
            return v;
        }

        const extra = [
            (v) => ({ color: "grey", name: "before", value: (v.totalCount - v._bucketCount) }),
            (v) => ({ color: "grey", name: "after", value: (v._total - v.totalCount) })
        ]

        const targetPercentiles = [
            { key: 0, label: "p0" },
            { key: 0.25, label: "p25" },
            { key: 0.50, label: "p50" },
            { key: 0.75, label: "p75" },
            { key: 0.90, label: "p90" },
            { key: 0.95, label: "p95" },
            { key: 0.99, label: "p99" },
            { key: 0.999, label: "p99.9" },
            { key: 0.9999, label: "p99.99" },
            { key: 0.99999, label: "p99.999" },
            { key: 0.999999, label: "p99.9999" },
            { key: 1.0, label: "p100" },
        ];

        // Map the definitions and display the exactly matched percentile
        const percentileTableRows = targetPercentiles.map(tp => {
            const bucket = stat.histogram.percentiles.find(e => e.percentile >= tp.key)
                || stat.histogram.percentiles[stat.histogram.percentiles.length - 1];

            const valueMs = bucket ? (bucket.to / 1000000).toFixed(2) : "N/A";
            const exactPercentile = bucket ? formatPercentValue(bucket.percentile) : "N/A";

            return (
                <tr key={tp.key}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #ededed', fontWeight: 600 }}>
                        {tp.label} <span style={{color: '#6a6e73', fontWeight: 400, fontSize: '0.9em'}}>({exactPercentile})</span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #ededed', textAlign: 'right', fontWeight: 600, color: '#002F5D' }}>
                        {valueMs} ms
                    </td>
                </tr>
            );
        });

        segments.push(
            <React.Fragment key={stat.metric}>
                <Title headingLevel="h1" size="4xl">{stat.name}</Title>

                {/* 1. Response Time Histogram */}
                <Card style={{ pageBreakInside: 'avoid', marginBottom: '1rem' }}>
                    <CardHeader>
                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                            <ToolbarGroup><ToolbarItem>{`${stat.metric} response time histogram`}</ToolbarItem></ToolbarGroup>
                        </Toolbar>
                    </CardHeader>
                    <CardBody style={{ minHeight: 410 }}>
                        <AutoSizer>{({ height, width }) => {
                            return (
                                <ComposedChart
                                    width={width}
                                    height={height}
                                    data={responsetimeHisto}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        scale="linear"
                                        domain={['auto', 'auto']}
                                        dataKey="value"
                                    >
                                        <Label
                                            value="ms"
                                            position="insideBottom"
                                            angle={0}
                                            offset={0}
                                            textAnchor='middle'
                                            style={{ textAnchor: 'middle' }}
                                        />
                                    </XAxis>
                                    <YAxis yAxisId={0} orientation="left" >
                                        <Label
                                            value="count"
                                            position="insideLeft"
                                            angle={-90}
                                            offset={0}
                                            textAnchor='middle'
                                            style={{ textAnchor: 'middle' }}
                                        />
                                    </YAxis>
                                    <Bar
                                        name="count"
                                        yAxisId={0}
                                        dataKey='count'
                                        barSize={2}
                                        isAnimationActive={false}
                                        dot={false}
                                        fill="#002F5D"
                                        stroke={"#002F5D"}
                                        style={{ strokeWidth: 2 }}
                                    />
                                    <Tooltip content={<OverloadTooltip />} labelFormatter={responsetimeTickFormatter} />
                                </ComposedChart>
                            )
                        }}</AutoSizer>
                    </CardBody>
                </Card>

                {/* 2. Percentile Distribution Chart */}
                <Card style={{ pageBreakInside: 'avoid', marginBottom: '1rem' }}>
                    <CardHeader>
                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                            <ToolbarGroup><ToolbarItem>{`${stat.metric} percentile distribution`}</ToolbarItem></ToolbarGroup>
                        </Toolbar>
                    </CardHeader>
                    <CardBody style={{ minHeight: 410 }}>
                        <AutoSizer>{({ height, width }) => {
                            return (
                                <ComposedChart
                                    width={width}
                                    height={height}
                                    data={percentileHisto}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        scale="log"
                                        domain={['auto', 'auto']}
                                        dataKey="inversed"
                                        interval={10}
                                        tickFormatter={tickFormatter}
                                    >
                                        <Label value="percentile" position="insideBottom" angle={0} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                                    </XAxis>
                                    <YAxis yAxisId={0} orientation="left"  >
                                        <Label value="ms" position="insideLeft" angle={-90} />
                                    </YAxis>
                                    <Line name="response time" yAxisId={0} dataKey='value' dot={false} isAnimationActive={false} stroke={'#002F5D'} style={{ strokeWidth: 2 }} />
                                    <Tooltip content={<OverloadTooltip extra={extra} />} labelFormatter={tickFormatter} />
                                </ComposedChart>
                            )
                        }}</AutoSizer>
                    </CardBody>
                </Card>

                {/* 3. Percentile Data Table */}
                <Card style={{ pageBreakInside: 'avoid', marginBottom: '1rem' }}>
                    <CardHeader>
                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                            <ToolbarGroup><ToolbarItem>{`${stat.metric} key performance percentiles`}</ToolbarItem></ToolbarGroup>
                        </Toolbar>
                    </CardHeader>
                    <CardBody>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'inherit' }}>
                            <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #d2d2d2' }}>Percentile</th>
                                <th style={{ padding: '12px 16px', borderBottom: '2px solid #d2d2d2', textAlign: 'right' }}>Response Time</th>
                            </tr>
                            </thead>
                            <tbody>
                            {percentileTableRows}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </React.Fragment>
        )
    })

    return (<>
        {segments}
        <br />
        <Card>
            <CardBody>
                <StatsTable data={totals} />
            </CardBody>
        </Card>
    </>)
}
