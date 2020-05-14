export const percentileAccessors = [
   { name: "99.9", accessor: v => v.percentileResponseTime['99.9'] },
   { name: "99.0", accessor: v => v.percentileResponseTime['99.0'] },
   { name: "90.0", accessor: v => v.percentileResponseTime['90.0'] },
   { name: "50.0", accessor: v => v.percentileResponseTime['50.0'] },
]

export const percentiles = percentileAccessors.map(a => a.name)

export const statAccessors = [
   ...percentileAccessors,
   { name: "Mean", accessor: v => v.meanResponseTime },
   { name: "rps", accessor: v => v.requestCount / ((v.endTime - v.startTime) / 1000) },
   { name: "eps", accessor: v => (v.status_5xx + v.status_4xx + v.status_other + v.resetCount + v.timeouts) / ((v.endTime - v.startTime) / 1000) },
]

export const codeAccessors = [
   { name: "2xx", accessor: v => v.status_2xx},
   { name: "3xx", accessor: v => v.status_3xx},
   { name: "4xx", accessor: v => v.status_4xx},
   { name: "5xx", accessor: v => v.status_5xx}
]