import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux'
import {
    Alert,
    Card,
    CardBody,
    PageSection,
} from '@patternfly/react-core';
import {
    getCpu,
} from '../redux/selectors';
import { AutoSizer } from 'react-virtualized';
import {
    Label,
    Legend,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import { DateTime } from 'luxon';
import theme from '../theme';

const colors = theme.colors.chart.blue.flatMap((col, i) => Object.values(theme.colors.chart).map(row => row[i]))

export default () => {
    const cpu = useSelector(getCpu)
    const tsToHHmmss = (v) => v ? DateTime.fromMillis(v).toFormat("HH:mm:ss") : ""
    const currentDomain = useMemo(() => cpu.reduce((range, ts) => {
           return [ Math.min(range[0], ts), Math.max(range[1], ts)]
        }, [Number.MAX_SAFE_INTEGER, 0] ), [cpu])
    const legendPayload = []
    const chartData = useMemo(() =>
         cpu.filter(d => d.cpuinfo && d.cpuinfo.length > 0)
            .map(d => d.cpuinfo.reduce((acc, item) => {
               let sum = Object.values(item).filter(x => typeof x === "number").reduce((s, v) => s + v)
               acc[item.node] = 100 - 100 * item.idle / sum
               return acc
            }, { timestamp: d.timestamp })), [cpu])
    const nodes = useMemo(() => Array.from(cpu
            .flatMap(d => d.cpuinfo.map(item => item.node))
            .reduce((set, node) => set.add(node), new Set()).values()), [cpu])
    const lines = nodes.map((node, i) => <Line type="monotone" dot={false} key={node} dataKey={node} stroke={colors[i % colors.length]}/>)
    const tooltipContent = ({active, payload, label}) => {
          if (active) {
             const tsData = cpu.filter(d => d.timestamp === label)
             const full = (tsData && tsData.length > 0 && tsData[0].cpuinfo) || []
             return (<div className="recharts-default-tooltip" style={{ background: "white", border: "1px solid black" }}>
                        <table id="toolTip">
                           <thead>
                           <tr>
                              <th>Node</th>
                              <th>#Cores</th>
                              <th>Usage</th>
                              <th>User</th>
                              <th>System</th>
                              <th>SoftIRQ</th>
                              <th>IRQ</th>
                              <th>IO wait</th>
                              <th>Idle</th>
                           </tr>
                           </thead>
                           <tbody>
                           { payload.sort((a, b) => Math.sign(b.value - a.value)).map(row => {
                              const ni = full.filter(item => item.node === row.name)
                              const nodeInfo = ni.length > 0 ? ni[0] : {}
                              let sum = Object.values(nodeInfo).filter(x => typeof x === "number").reduce((s, v) => s + v)
                              return (<tr key={row.name} >
                                 <td style={{ textAlign: "left", color: row.color }}>{row.name}</td>
                                 <td>{Number(sum).toFixed(0)}</td>
                                 <td>{Number(row.value).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.user / sum).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.system / sum).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.softirq / sum).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.irq / sum).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.iowait / sum).toFixed(1)}%</td>
                                 <td>{Number(100 * nodeInfo.idle / sum).toFixed(1)}%</td>
                              </tr>) })
                           }
                           </tbody>
                        </table>
                     </div>)
          }
    }
    if (cpu.length == 0) {
        return (<Alert variant="warning" title="No CPU data">Report does not contain any CPU data.</Alert>)
    }
    return (
         <PageSection>
            <Card>
               <CardBody  style={{minHeight: "400px" }}>
                  <AutoSizer>{({ height, width }) => (
                     <LineChart
                        width={width}
                        height={height}
                        data={chartData}
                        style={{ userSelect: 'none' }}
                     >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            allowDataOverflow={true}
                            type="number"
                            scale="time"
                            dataKey="timestamp"
                            tickFormatter={tsToHHmmss}
                            //domain={domain}
                            domain={currentDomain}
                        />
                        <YAxis yAxisId={0} orientation="left" tickFormatter={ v => v + "%" }>
                            <Label value="CPU usage" position="insideLeft" angle={-90} offset={0} textAnchor='middle' style={{ textAnchor: 'middle' }} />
                            {/* <Label value="response time" position="top" angle={0} offset={0} textAnchor='start' style={{ textAnchor: 'start' }} /> */}
                        </YAxis>
                        <Tooltip content={tooltipContent} formatter={(e) => Number(e).toFixed(1) + "%"} itemSorter={p => -p.value}/>
                        <Legend payload={legendPayload} align="left" />
                        {lines}
                     </LineChart>
                  )}</AutoSizer>
               </CardBody>
            </Card>
         </PageSection>
    )
}