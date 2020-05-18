import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
    Card,
    CardBody,
    PageSection,
    Title,
} from '@patternfly/react-core';
import {
    Bar,
    Label,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
    Scatter,
} from 'recharts';
import { AutoSizer } from 'react-virtualized';

import OverloadTooltip from '../components/OverloadTooltip'
import {
   splitName,
   allRunsTotalsSelector,
   allRunIdsSelector,
} from '../redux/selectors'
import theme from '../theme'
import {
   meanAccessor,
   rpsAccessor,
   epsAccessor,
} from './accessors'

const colors = theme.colors.chart
const colorNames = Object.keys(colors);

// Here we use diffs because of the way how bars are stacked. We need to deconstruct it later in the tooltip
export const diffPercentileAccessors = [
   { name: "50.0", accessor: v => v.percentileResponseTime['50.0'] },
   { name: "90.0", accessor: v => v.percentileResponseTime['90.0'] - v.percentileResponseTime['50.0'] },
   { name: "99.0", accessor: v => v.percentileResponseTime['99.0'] - v.percentileResponseTime['90.0'] },
   { name: "99.9", accessor: v => v.percentileResponseTime['99.9'] - v.percentileResponseTime['99.0'] },
]

const statAccessors = [
   ...diffPercentileAccessors,
   meanAccessor, rpsAccessor, epsAccessor
]

function tooltipContent(payload) {
   const byStat = payload.reduce((o, item) => {
      const runId = item.dataKey.split('.', 1)
      let byRun = o[item.name]
      if (!byRun) {
         byRun = {}
         o[item.name] = byRun
      }
      byRun[runId] = { value: item.value, unit: item.unit }
      return o
   }, {})
   // Recalculate original values from the diff
   if (byStat['p90.0']) Object.entries(byStat['p90.0']).forEach(([runId, item]) => item.value += byStat['p50.0'][runId].value)
   if (byStat['p99.0']) Object.entries(byStat['p99.0']).forEach(([runId, item]) => item.value += byStat['p90.0'][runId].value)
   if (byStat['p99.9']) Object.entries(byStat['p99.9']).forEach(([runId, item]) => item.value += byStat['p99.0'][runId].value)
   return (
      <div className="recharts-default-tooltip" style={{ background: "white", border: "1px solid black" }}>
         <table id="toolTip">
            <thead>
            <tr>
               <th>Run ID</th>
               {
                  Object.keys(Object.values(byStat)[0]).map(run => (<th>{run}</th>))
               }
            </tr>
            </thead>
            <tbody>
            {
               Object.entries(byStat).map(([name, stats]) => (
                  <tr key={name}><td style={{ textAlign: "left" }}>{name}</td>{
                     Object.entries(stats).map(([runId, s]) => (<td key={runId}>{
                        s.unit === "ns" ? Number(s.value / 1000000).toFixed(0) + " ms": Number(s.value).toFixed(0)
                     }</td>))
                  }</tr>
               ))
            }
            </tbody>
         </table>
      </div>)
}

export default () => {
   const totals = useSelector(allRunsTotalsSelector)
   const runIds = useSelector(allRunIdsSelector)
   const table = useMemo(() => {
      const perChart = {}
      Object.entries(totals).forEach(([runId, data]) => {
         data.forEach(v => {
            const { fork } = splitName(v.phase)
            const value = statAccessors.reduce((m, stat) => {
               m[runId + "." + stat.name] = stat.accessor(v.summary)
               return m
            }, {
               runId,
               phase: v.phase,
               start: v.start,
            })
            let byPhase = perChart[fork + "." + v.metric]
            if (!byPhase) {
               perChart[fork + "." + v.metric] = byPhase = {}
            }
            let list = byPhase[v.phase]
            if (!list) {
               byPhase[v.phase] = [ value ]
            } else {
               list.push(value)
            }
         })
      })
      return Object.entries(perChart).reduce((o, [chart, byPhase]) => {
         // First sort the data for each phase by inner time
         Object.values(byPhase).forEach(list => list.sort((a, b) => a.start - b.start))
         const phases = Object.values(byPhase)
         phases.sort((a, b) => a[0].start - b[0].start)
         o[chart] = phases.flat()
         return o
      }, {})
   }, [totals])
   const nanoToMs = (v) => Number(v / 1000000.0).toFixed(0) + "ms"
   return (
         <PageSection>
         {
            Object.entries(table).map(([forkMetric, perChart]) => {
               const maxResponseTimes = perChart.map(v => {
                  // We need to sum the diffs of percentiles to get actual p99.9 value
                  return v[v.runId + ".99.9"] + v[v.runId + ".99.0"] + v[v.runId + ".90.0"] + v[v.runId + ".50.0"]
               }).sort((a, b) => a - b)
               // We need to use functional range to reduce the domain below dataMax
               const responseTimeDomain = [0, dataMax => maxResponseTimes[Math.floor(maxResponseTimes.length * 0.8)] * 2]
               return (<Card>
                  <CardBody style={{ minHeight: 400 }}>
                     <Title key={forkMetric + ".title"} headingLevel="h1" size="4xl">{forkMetric}</Title>
                     <AutoSizer key={forkMetric + ".chart"}>{({ height, width }) => (
                        <ComposedChart
                              width={width}
                              height={height}
                              data={perChart}
                              style={{ userSelect: 'none' }}
                        >
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis xAxisId={0}
                               allowDataOverflow={true}
                               type="category"
                               dataKey="runId"
                           />
                           <XAxis xAxisId={1}
                               allowDataOverflow={true}
                               type="category"
                               dataKey="phase"
                           />
                           <YAxis yAxisId={0} orientation="left" tickFormatter={nanoToMs} domain={ responseTimeDomain }>
                               <Label value="response time" position="insideLeft" angle={-90} style={{ textAnchor: 'middle' }} />
                           </YAxis>
                           <YAxis yAxisId={1} orientation="right" >
                               <Label value="requests/s" position="insideRight" angle={-90} style={{ textAnchor: 'middle' }} />
                           </YAxis>
                           <YAxis yAxisId={2} orientation="right">
                               <Label value="errors/s" position="insideRight" angle={-90} style={{ textAnchor: 'middle' }} />
                           </YAxis>
                           <Tooltip content={ ({active, payload, label}) => {
                              if (active) {
                                 return tooltipContent(payload)
                              }
                           }} />
                           { runIds.flatMap((runId, runIndex) => diffPercentileAccessors.map((a, aIndex) => {
                                 const pallete = colors[colorNames[runIndex]]
                                 const color = pallete[diffPercentileAccessors.length - aIndex - 1]
                                 return (
                                 <Bar yAxisId={0}
                                      dataKey={ `${runId}.${a.name}` }
                                      name={ "p" + a.name }
                                      stackId={0}
                                      stroke={ color }
                                      fill={ color }
                                      unit="ns"
                                 />
                              )}
                           )) }
                           { runIds.map((runId) => (
                              <Line yAxisId={0}
                                    key={ `${runId}.Mean` }
                                    dataKey={ `${runId}.Mean` }
                                    name="Mean"
                                    connectNulls={true}
                                    stroke="#FF0000"
                                    fill="#FF0000"
                                    unit="ns"
                              />
                           ))}
                           { runIds.map((runId) => (
                              <Line yAxisId={1}
                                    key={ `${runId}.rps` }
                                    dataKey={ `${runId}.rps` }
                                    name="Requests/s"
                                    connectNulls={true}
                                    stroke="#00A300"
                                    fill="#00A300"
                              />
                           ))}
                           { runIds.map((runId) => (
                              <Line yAxisId={2}
                                    key={ `${runId}.eps` }
                                    dataKey={ `${runId}.eps` }
                                    name="Errors/s"
                                    connectNulls={true}
                                    stroke="#A30000"
                                    fill="#A30000"
                              />
                           ))}
                           <Legend payload={[
                              { color: '#FF0000', fill: '#FF0000', type: 'rect', value: "Mean" },
                              { color: '#00A300', fill: '#00A300', type: 'rect', value: "Requests/s" },
                              { color: '#A30000', fill: '#A30000', type: 'rect', value: "Errors/s" },
                           ]} align="left" />
                        </ComposedChart>
                     )}</AutoSizer>
                  </CardBody>
                  <br />
               </Card>)})
         }

         </PageSection>
   )
}
