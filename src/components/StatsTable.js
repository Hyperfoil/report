import React from 'react';

import Table from './Table'

const right = { textAlign: "right" }

const columns = [
     {
       Header: "Start",
       accessor: "start",
     }, {
       Header:"Phase",
       accessor:"phase",
     }, {
       Header: "Metric",
       accessor: "metric",
     }, {
       Header: "Requests",
       accessor: "summary.requestCount",
       headerStyle: right,
       style: right,
     }, {
       Header: "Responses",
       accessor: "summary.responseCount",
       headerStyle: right,
       style: right,
     }, {
       Header: "Mean",
       accessor: "summary.meanResponseTime",
       Cell: arg => Number(arg.cell.value / 1000000.0).toFixed(0) + " ms",
       headerStyle: right,
       style: right,
     }, {
       Header: "Invalid",
       accessor: "summary.invalid",
       headerStyle: right,
       style: right,
     }, {
       Header: "Timeouts",
       accessor: "summary.requestTimeouts",
       headerStyle: right,
       style: right,
     }, {
       Header: "Blocked",
       accessor: "summary.blockedTime",
       headerStyle: right,
       style: right,
     }, {
       Header: "2xx",
       accessor: "summary.extensions.http.status_2xx",
       headerStyle: right,
       style: right,
     }, {
       Header: "3xx",
       accessor: "summary.extensions.http.status_3xx",
       headerStyle: right,
       style: right,
     }, {
       Header: "4xx",
       accessor: "summary.extensions.http.status_4xx",
       headerStyle: right,
       style: right,
     }, {
       Header: "5xx",
       accessor: "summary.extensions.http.status_5xx",
       headerStyle: right,
       style: right,
     }, {
       Header: "Cache hits",
       accessor: "summary.extensions.http.cacheHits",
       headerStyle: right,
       style: right,
     }
];

const redFailures = row => {
   return row.original.failures && row.original.failures > 0 ? { background: "rgba(255, 0, 0, 0.2)" } : {}
}

export default ({data}) => {
   return (<Table columns={columns}
                  data={data}
                  initialSortBy={[{id: "start"}, { id: "metric" }]}
                  hidden={["start"]}
                  rowStyler={ redFailures }/>)
}