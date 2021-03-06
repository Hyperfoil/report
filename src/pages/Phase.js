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
                return undefined; //
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
        const tickFormatter = (v) => {
            if (typeof tickTransform[v] !== "undefined") {
                v = tickTransform[v]
            }
            return Number(100 * v).toFixed(2)+"%"
        }
        const responsetimeTickFormatter = (v,f,g) => {
            // const entry = responsetimeHisto[v];
            return v;
            //return Math.round(entry.from / 1000000).toFixed(0)+"-"+Math.round(entry.to / 1000000).toFixed(0)
        }

        const extra = [
            (v) => ({ color: "grey", name: "before", value: (v.totalCount - v._bucketCount) }),
            (v) => ({ color: "grey", name: "after", value: (v._total - v.totalCount) })
        ]

        segments.push(
            <React.Fragment key={stat.metric}>
                <Title headingLevel="h1" size="4xl">{stat.name}</Title>
                <Card style={{ pagreBreakInside: 'avoid' }}>
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
                                        domain={['auto', 'auto']} //for use with log
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
                <Card style={{ pageBreakInside: 'avoid' }}>
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
                                         domain={['auto', 'auto']} //for use with log
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
