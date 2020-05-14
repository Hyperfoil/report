import React from 'react';
import { useTable, useSortBy } from 'react-table'
import clsx from 'clsx';

// We need to pass the same empty list to prevent re-renders
const NO_DATA = []

function Table({ columns, data, initialSortBy = [], hidden = [], rowStyler }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
  } = useTable(
    {
      columns,
      data: data || NO_DATA,
      initialState: {
         sortBy: initialSortBy,
         hiddenColumns: hidden
      },
    },
    useSortBy,
  )
  return (
    <>
      <table className="pf-c-table pf-m-compact pf-m-grid-md" {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup,headerGroupIndex) => {
            return (
              <tr key={headerGroupIndex} {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column,columnIndex) => {
                  const sortByToggleProps = column.getSortByToggleProps()
                  const headerProps = column.getHeaderProps(sortByToggleProps)
                  headerProps.style = { ...headerProps.style, ...column.headerStyle }
                  return (
                  // Add the sorting props to control sorting. For this example
                  // we can add them into the header props

                  <th className={clsx("pf-c-table__sort", column.isSorted ? "pf-m-selected" : "")} key={columnIndex} {...headerProps} >
                      {column.render('Header')}
                      {/* Add a sort direction indicator */}
                      {column.disableSortBy ? "" : (
                        <span className="pf-c-table__sort-indicator">
                          <i className={clsx("fas", column.isSorted ? (column.isSortedDesc ? "fa-long-arrow-alt-down" : "fa-long-arrow-alt-up") : "fa-arrows-alt-v")}></i>
                        </span>
                      )}
                  </th>
                )})}
              </tr>
            )
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(
            (row, i) => {
              prepareRow(row);
              const rowProps = row.getRowProps();
              if (rowStyler) {
                  rowProps.style = { ...rowProps.style, ...rowStyler(row) }
              }
              return (
                <tr key={i} {...rowProps} >
                  {row.cells.map((cell,cellIndex) => {
                    const cellProps = cell.getCellProps()
                    cellProps.style = { ...cellProps.style, ...cell.column.style }
                    return (
                      <td data-label={cell.column.Header} key={cellIndex} {...cellProps} >{cell.render('Cell')}</td>
                    )
                  })}
                </tr>
              )
            }
          )}
        </tbody>
      </table>
    </>
  )
}

export default Table;