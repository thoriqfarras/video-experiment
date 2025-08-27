'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      sorting,
    },
  });

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b bg-background/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Search title</label>
            <Input
              placeholder="Type to search..."
              value={(table.getColumn('title')?.getFilterValue() as string | undefined) ?? ''}
              onChange={(e) => table.getColumn('title')?.setFilterValue(e.target.value)}
              className="h-9 w-56"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Group</label>
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={(() => {
                const v = table.getColumn('group')?.getFilterValue() as number | '' | undefined;
                return v === undefined || v === '' ? '' : String(v);
              })()}
              onChange={(e) => {
                const val = e.target.value;
                table.getColumn('group')?.setFilterValue(val === '' ? '' : Number(val));
              }}
            >
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} rows
        </div>
      </div>
      <div className="w-full">
        <Table>
          <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc'
                          ? ' \u2191'
                          : header.column.getIsSorted() === 'desc'
                          ? ' \u2193'
                          : ''}
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
          </TableHeader>
          <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


