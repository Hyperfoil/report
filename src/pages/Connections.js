import React, { useMemo } from 'react';
import { useSelector } from 'react-redux'
import {
    Alert,
    Card,
    CardBody,
    PageSection,
} from '@patternfly/react-core';
import {
   getAgentNames,
   getConnections,
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
import { DateTime } from 'luxon';

const colors = [ "#FF0000", "#00FF00", "#0000FF", "#888800", "#008888", "#880088" ]

function ConnectionsChart({ data, agent, width, height, domain }) {
   const tsToHHmmss = (v) => v ? DateTime.fromMillis(v).toFormat("HH:mm:ss") : ""

   const chartData = useMemo(() => {
      const byTimestamp = {}
      Object.entries(data).forEach(([type, values]) => values.forEach(({ timestamp, address, min, max }) => {
         if (address === agent) {
            let dp = byTimestamp[timestamp]
            if (!dp) {
               dp = { timestamp }
               byTimestamp[timestamp] = dp
            }
            dp[type] = [ min, max ]
         }
      }))
      return Object.values(byTimestamp).sort((a, b) => a._areaKey - b._areaKey)
   }, [data])

   const areas = Object.keys(data).sort().map((type, i) =>
      <Area
         name={type}
         fillOpacity={0.2}
         type="monotone"
         dot={false}
         key={type}
         dataKey={type}
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
                  <th>Type</th>
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
         <h4 style={{ whiteSpace: "nowrap" }}>Agent: { agent }</h4>
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

export default () => {
    const allConnections = useSelector(getConnections)
    const agents = useSelector(getAgentNames)

    const domains = useMemo(() => Object.values(allConnections)
      .flatMap(targetConns => Object.values(targetConns)).flat()
      .reduce((acc, { timestamp, min, max }) => [
         Math.min(acc[0], timestamp), Math.max(acc[1], timestamp),
         Math.min(acc[2], min), Math.max(acc[3], max) ],
         [Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER, 0]),
      [allConnections])

    if (Object.values(allConnections).length === 0) {
        return (<Alert variant="warning" title="No connections data">Report does not contain any data about connections.</Alert>)
    }
    return (
         <PageSection>
            <Card>
               <CardBody style={{minHeight: "400px" }}>
                  { Object.entries(allConnections).sort(([t1, _1], [t2, _2]) => {
                     t1 = t1.toLowerCase()
                     t2 = t2.toLowerCase()
                     if (t1 < t2) return -1;
                     if (t2 > t1) return 1;
                     return 0
                  }).map(([target, data]) => <React.Fragment key={target}>
                     <h2>Endpoint: { target }</h2>
                     { agents.map(a =>
                        <AutoSizer
                        key={target + "_" + a}
                           disableHeight={true}>{({ width }) => (
                           <ConnectionsChart
                              width={width}
                              height={400}
                              data={data}
                              agent={a}
                              domain={[ domains[0], domains[1] ]}
                           />)}
                        </AutoSizer>
                     )}
                  </React.Fragment>)}
               </CardBody>
            </Card>
         </PageSection>
    )
}