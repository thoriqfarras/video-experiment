'use client';

import { ColumnDef } from '@tanstack/react-table';
import { VideoActionsCell } from './components/cells';

export type VideoRow = {
  id: string;
  title: string;
  group: number;
  url: string;
  is_active: boolean;
};

export const columns: ColumnDef<VideoRow>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Title' },
  {
    accessorKey: 'group',
    header: 'Group',
    filterFn: (row, id, value) => {
      if (value === '' || value === undefined || value === null) return true;
      const cell = row.getValue(id) as number | string | undefined;
      return Number(cell) === Number(value);
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <VideoActionsCell video={row.original} />,
  },
];


