'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap gap-3 p-3 border-b bg-background/50">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">From</label>
          <Input
            type="date"
            value={((table.getColumn('created_at')?.getFilterValue() as { from?: string; to?: string } | undefined)?.from) ?? ''}
            onChange={(e) => {
              const prev = (table.getColumn('created_at')?.getFilterValue() as { from?: string; to?: string } | undefined) ?? {};
              table.getColumn('created_at')?.setFilterValue({ ...prev, from: e.target.value });
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">To</label>
          <Input
            type="date"
            value={((table.getColumn('created_at')?.getFilterValue() as { from?: string; to?: string } | undefined)?.to) ?? ''}
            onChange={(e) => {
              const prev = (table.getColumn('created_at')?.getFilterValue() as { from?: string; to?: string } | undefined) ?? {};
              table.getColumn('created_at')?.setFilterValue({ ...prev, to: e.target.value });
            }}
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
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Results</label>
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={(() => {
              const v = table.getColumn('is_used')?.getFilterValue() as boolean | '' | undefined;
              if (v === '' || v === undefined || v === null) return '';
              return v ? 'true' : 'false';
            })()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') table.getColumn('is_used')?.setFilterValue('');
              else table.getColumn('is_used')?.setFilterValue(val === 'true');
            }}
          >
            <option value="">All</option>
            <option value="true">Available</option>
            <option value="false">Not yet available</option>
          </select>
        </div>
      </div>
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
  );
}
