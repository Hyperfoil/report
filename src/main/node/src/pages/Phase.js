import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux'

import { useHistory, useParams } from "react-router"

import {
    Card,
    CardHeader,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
    CardBody,
    PageSection,
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

import OverloadTooltip from '../components/OverloadTooltip'

import {splitName} from '../redux/reducers';

export default () => {
    let { phaseId } = useParams();
    const split = splitName(phaseId)
    const data = useSelector(state => state.data)
    const segments = []

    const metrics = data.phase[split.phase].iteration[split.iteration].fork[split.fork];
    Object.keys(metrics.metric).forEach(metricName => {
        const metric = metrics.metric[metricName]

        const histo = metric.histogram.map((entry, index, all) => {
            const rtrn = { ...entry }
            rtrn._bucketCount = index > 0 ? entry.totalCount - all[index - 1].totalCount : entry.totalCount
            rtrn._total = all[all.length - 1].totalCount;
            if (rtrn.percentile === 1) {
                return undefined; //
            } else {
                rtrn.inversed = (1 / (1 - rtrn.percentile))
                return rtrn;
            }
        }).filter(v => v !== undefined);
        const tickTransform = {}
        const ranges = {}
        histo.forEach((entry,idx,all) => {
            tickTransform[entry.inversed] = entry.percentile
            ranges[entry.value] = (idx>0 ? all[idx-1].value : 0)
        })
        const tickFormatter = (v) => {
            if (typeof tickTransform[v] !== "undefined") {
                v = tickTransform[v]
            }
            return Number(100 * v).toFixed(2)
        }
        const rangeTickFormatter = (v,f,g) => {
            if( typeof ranges[v] !== "undefined"){
                return Number(100 * ranges[v]).toFixed(2)+" - "+Number(100 * v).toFixed(2)
            }
            return Number(100 * v).toFixed(2)
        }

        const extra = [
            (v) => ({ color: "grey", name: "before", value: (v.totalCount - v._bucketCount) }),
            (v) => ({ color: "grey", name: "after", value: (v._total - v.totalCount) })
        ]

        segments.push(
            <PageSection key={metricName}>
                <Card style={{ pageBreakInside: 'avoid' }}>
                    <CardHeader>
                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                            <ToolbarGroup><ToolbarItem>{`${split.phase} ${split.iteration === ":DEFAULT:" ? "" : split.iteration} ${metricName} response time histogram`}</ToolbarItem></ToolbarGroup>
                        </Toolbar>
                    </CardHeader>
                    <CardBody style={{ minHeight: 410 }}>
                        <AutoSizer>{({ height, width }) => {
                            return (
                                <ComposedChart
                                    width={width}
                                    height={height}
                                    data={histo}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        scale="log"
                                        domain={['auto', 'auto']} //for use with log
                                        dataKey="value"
                                        //ticks={[1,10,100,1000,10000,100000,1000000]}
                                        // tickFormatter={tickFormatter}
                                    >
                                        <Label value="response time" position="insideBottom" angle={0} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                                    </XAxis>
                                    <YAxis yAxisId={0} orientation="left" >
                                        <Label value="count" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Bar name="requests" yAxisId={0} dataKey='_bucketCount' barSize={2} isAnimationActive={false} dot={false} fill="#002F5D" stroke={"#002F5D"} style={{ strokeWidth: 2 }} />
                                    <Tooltip content={<OverloadTooltip />} labelFormatter={rangeTickFormatter} />
                                </ComposedChart>
                            )

                        }}</AutoSizer>
                    </CardBody>

                </Card>
                <Card style={{ pageBreakInside: 'avoid' }}>
                    <CardHeader>
                        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                            <ToolbarGroup><ToolbarItem>{`${split.phase} ${split.iteration === ":DEFAULT:" ? "" : split.iteration} ${metricName} percentile histogram`}</ToolbarItem></ToolbarGroup>
                        </Toolbar>
                    </CardHeader>
                    <CardBody style={{ minHeight: 410 }}>
                        <AutoSizer>{({ height, width }) => {
                            return (
                                <ComposedChart
                                    width={width}
                                    height={height}
                                    data={histo}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        scale="log"
                                        domain={['auto', 'auto']} //for use with log
                                        dataKey="inversed"
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
                                    <Line name="response time" yAxisId={1} dataKey='value' dot={false} isAnimationActive={false} stroke={'#002F5D'} style={{ strokeWidth: 2 }} />
                                    <Tooltip content={<OverloadTooltip extra={extra} />} labelFormatter={tickFormatter} />
                                </ComposedChart>
                            )

                        }}</AutoSizer>
                    </CardBody>
                </Card>
            </PageSection>
        )
    })


    return (
        <React.Fragment>{segments}

        </React.Fragment>
    )
}
