import React from 'react';
import { Column, Row, useTable } from 'react-table';

interface CustomTableProps<T extends {}> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: Row<T>) => void;
}

export const CustomTable = <T extends {}>(props: CustomTableProps<T>) => {
    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
        columns: props.columns,
        data: props.data
    });

    return (
        <table {...getTableProps()}>
            <thead>
                {headerGroups.map((headerGroup) => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map((column) => (
                            <th
                                {...column.getHeaderProps()}
                                style={{
                                    fontWeight: 'bold'
                                }}
                            >
                                {column.render('Header')}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody {...getTableBodyProps()}>
                {rows.map((row) => {
                    prepareRow(row);
                    return (
                        <tr
                            {...row.getRowProps()}
                            onClick={props.onRowClick ? () => props.onRowClick!(row) : undefined}
                        >
                            {row.cells.map((cell) => {
                                return (
                                    <td
                                        {...cell.getCellProps()}
                                        style={{
                                            padding: '10px'
                                        }}
                                    >
                                        {cell.render('Cell')}
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

interface EditableCellProps<T extends {}> {
    accessor: keyof T;
    collection: T[];
    disabled?: boolean;
    inputType?: string;
    rowIndex: number;
    setCollection: (collection: T[]) => void;
    value: string | number;
}

export const EditableCell = <T extends {}>(props: EditableCellProps<T>) => {
    const [localValue, setLocalValue] = React.useState(props.value);

    return (
        <input
            disabled={props.disabled}
            onBlur={() => {
                props.setCollection(
                    props.collection.map((item, itemIndex) => {
                        return itemIndex === props.rowIndex
                            ? { ...item, [props.accessor]: localValue }
                            : item;
                    })
                );
            }}
            onChange={(event) => {
                setLocalValue(event.target.value);
            }}
            type={props.inputType || 'text'}
            value={localValue}
        />
    );
};
