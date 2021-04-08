import React, { useMemo } from 'react';
import { useSelector } from 'react-redux'
import {
    Alert,
    Card,
    CardBody,
    PageSection,
} from '@patternfly/react-core';
import {
   getSessions,
} from '../redux/selectors';
import { AutoSizer } from 'react-virtualized';
import {
   Area,
   Legend,
   CartesianGrid,
   XAxis,
   YAxis,
   Tooltip,
   ComposedChart,
} from 'recharts';
import { useParams } from 'react-router'
import { DateTime } from 'luxon';

const colors = [ "#FF0000", "#00FF00", "#0000FF", "#888800", "#008888", "#880088" ]

function SessionsChart({ phase, fork, width, height }) {
   const tsToHHmmss = (v) => v ? DateTime.fromMillis(v).toFormat("HH:mm:ss") : ""
   const sessions = useSelector(getSessions)

   const chartData = useMemo(() => {
      const byTimestamp = {}
      sessions.filter(p => p.phase === phase && p.fork === fork)
         .forEach(p => p.sessions.forEach(({ timestamp, agent, minSessions, maxSessions }) => {
         let dp = byTimestamp[timestamp]
         if (!dp) {
            dp = { timestamp }
            byTimestamp[timestamp] = dp
         }
         dp[agent] = [ minSessions, maxSessions ]
      }))
      return Object.values(byTimestamp).sort((a, b) => a.timestamp - b.timestamp)
   }, [sessions, phase, fork])

   const domain = useMemo(() => {
      return chartData.reduce(
         (acc, { timestamp }) => {
            return [ Math.min(acc[0], timestamp), Math.max(acc[1], timestamp)]
         },
         [Number.MAX_SAFE_INTEGER, 0])
   }, [chartData])

   const areas = [ ...new Set(sessions.flatMap(p => p.sessions.map(({ agent }) => agent)))].sort().map((agent, i) =>
      <Area
         name={agent}
         fillOpacity={0.2}
         type="monotone"
         dot={false}
         key={agent}
         dataKey={agent}
         stroke={colors[i % colors.length]}
         fill={colors[i % colors.length]}
      />)

   const tooltipContent = ({active, payload, label}) => {
      if (!active) {
         return <div />;
      }
      return (
         <div className="recharts-default-tooltip" style={{ background: "white", border: "1px solid black" }}>
            <table id="toolTip">
               <thead>
               <tr>
                  <th>{'\u00A0'}</th>
                  <th>Agent</th>
                  <th>Min</th>
                  <th>Max</th>
               </tr>
               </thead>
               <tbody>
                  { payload && payload.map(({name, value}, i) => (
                     <tr key={i}>
                        <td><span className="legend-icon" style={{borderColor: colors[i] }}>{'\u00A0'}</span></td>
                        <td style={{ textAlign: "left"}}>{name}</td>
                        <td>{value[0]}</td>
                        <td>{value[1]}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>)
   }


   return (
      <div>
         <ComposedChart
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
               domain={domain}
            />
            <YAxis yAxisId={0} orientation="left" />
            <Legend verticalAlign="bottom" height={36}/>
            {areas}
            <Tooltip content={tooltipContent} />
         </ComposedChart>
      </div>)
}

export function PhaseSessions() {
   const params = useParams()
   return (
      <AutoSizer
         disableHeight={true}>{({ width }) => (
         <SessionsChart
            width={width}
            height={400}
            phase={params.phase}
            fork={params.fork || ""}
         />)}
      </AutoSizer>
   )
}

export default () => {
   const sessions = useSelector(getSessions)

   if (sessions.length === 0) {
      return (<Alert variant="warning" title="No sessions data">Report does not contain any data about sessions.</Alert>)
   }
   const combos = [ ...new Set(sessions.map(p => ({ phase: p.phase, fork: p.fork })))].sort((p1, p2) => {
      const phase1 = p1.phase.toLowerCase()
      const phase2 = p2.phase.toLowerCase()
      if (phase1 < phase2) return -1;
      if (phase1 > phase2) return 1;
      const fork1 = p1.fork.toLowerCase()
      const fork2 = p2.fork.toLowerCase()
      if (fork1 < fork2) return -1;
      if (fork1 > fork2) return 1;
      return 0
   })
   return (
      <PageSection>
         <Card>
            <CardBody style={{minHeight: "400px" }}>
               { combos.map(combo => {
                  return (<React.Fragment key={combo.phase + combo.fork}>
                     <h2>Phase: { combo.phase } { combo.fork && "Fork: " + combo.fork }</h2>
                     <AutoSizer
                        disableHeight={true}>{({ width }) => (
                        <SessionsChart
                           width={width}
                           height={400}
                           phase={combo.phase}
                           fork={combo.fork}
                        />)}
                     </AutoSizer>
                  </React.Fragment>)
               } ) }
            </CardBody>
         </Card>
      </PageSection>
   )
}