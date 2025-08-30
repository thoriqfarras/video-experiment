'use client';

import { ColumnDef } from '@tanstack/react-table';
import { VideoActionsCell } from './components/cells';

export type VideoRow = {
  id: string;
  title: string;
  group: number;
  url: string;
  sex?: string;
  nar_level?: string;
  thumbnail_proxy_url?: string;
  is_active: boolean;
};

export const columns: ColumnDef<VideoRow>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Title' },
  {
    accessorKey: 'sex',
    header: 'Sex',
    cell: ({ row }) => {
      const v = (row.getValue('sex') as string | undefined) ?? '';
      return v.toUpperCase();
    },
    filterFn: (row, id, value) => {
      if (value === '' || value === undefined || value === null) return true;
      const cell = row.getValue(id) as string | undefined;
      return cell?.toLowerCase() === value.toLowerCase();
    },
  },
  {
    accessorKey: 'nar_level',
    header: 'Nar Level',
    cell: ({ row }) => {
      const v = (row.getValue('nar_level') as string | undefined) ?? '';
      return v.toUpperCase();
    },
    filterFn: (row, id, value) => {
      if (value === '' || value === undefined || value === null) return true;
      const cell = row.getValue(id) as string | undefined;
      return cell?.toLowerCase() === value.toLowerCase();
    },
  },
  {
    accessorKey: 'thumbnail_proxy_url',
    header: 'Thumbnail',
    cell: ({ row }) => {
      const url = row.getValue('thumbnail_proxy_url') as string | undefined;
      if (!url) return <span className="text-gray-400">No thumbnail</span>;
      return (
        <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={url} 
            alt="Thumbnail" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="hidden text-xs text-gray-500 flex items-center justify-center h-full">📹</span>
        </div>
      );
    },
  },
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


