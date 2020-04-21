import React, { useState } from 'react';
import {
    Table,
    TableHeader,
    TableBody,
    sortable,
    SortByDirection,
    headerCol,
    TableVariant,
    expandable,
    cellWidth
} from '@patternfly/react-table';

const DataTable = ({title="title", columns = [{id:'one',label:'One',render:false},], data = []})=>{
    const [order, setOrder] = useState(SortByDirection.desc);
    const [orderBy, setOrderBy] = useState(0);
    const tableColumns = columns.map(col=>(
        {
            title:col.label||col.id, 
            transforms:[sortable]}
        
    ))
    const rows = data.map(entry=>{
        return columns.map(col=>(col.render ? col.render(entry[col.id]) : entry[col.id]))
    }).sort((a, b) => {
        
        return (a[orderBy] < b[orderBy] ? -1 : a[orderBy] > b[orderBy] ? 1 : 0)
    })
    if(order !== SortByDirection.asc){
        rows.reverse();
    }
    return (
        <Table
            header={title}
            sortBy={{index:orderBy,direction:order}}
            onSort={(_event, index, direction)=>{
                setOrder(direction)
                setOrderBy(index)
            }}
            variant={TableVariant.compact} cells={tableColumns} rows={rows}
        >
            <TableHeader />
            <TableBody />
        </Table>
    )
    // return (
    //     <table
    //         className="pf-c-table pf-m-compact pf-m-grid-md" 
    //         role="grid" 
    //         aria-label="This is a compact table example" 
    //         id="compact-table"
    //     >
    //         <thead>
    //             <tr>
    //                 {columns.map((col,colIdx)=>(
    //                     <th key={colIdx} scope="col">{col.label || col.id}</th>
    //                 ))}
    //             </tr>
    //         </thead>
    //         <tbody>
    //             {data.map((entry,entryIdx)=>(
    //               <tr key={entryIdx}>
    //                 {columns.map((col,colIdx)=>(
    //                     <td key={entryIdx+'.'+colIdx} data-label={col.label || col.id}>
    //                         {col.render ? col.render(entry[col.id]) : entry[col.id]}
    //                     </td>
    //                 ))}
    //               </tr>
    //             ))}
    //         </tbody>
    //     </table>
    // )
}

export default DataTable;