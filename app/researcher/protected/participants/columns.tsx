'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ParticipantsActionsCell, CreatedAtCell, CodeCell, ResultCell } from './components/cells';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type ParticipantCodes = {
  id: string;
  code: number;
  group: number;
  is_used: boolean;
  created_at: Date;
  is_active: boolean;
};

export const columns: ColumnDef<ParticipantCodes>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => <CodeCell value={row.getValue('code') as number | string | undefined} /> },
  { accessorKey: 'created_at', header: 'Generated at', cell: ({ row }) => <CreatedAtCell value={row.getValue('created_at') as string | Date} /> },
  {
    accessorKey: 'group',
    header: 'Group',
    filterFn: (row, id, value) => {
      if (value === '' || value === undefined || value === null) return true;
      const cell = row.getValue(id) as number | string | undefined;
      return Number(cell) === Number(value);
    },
  },
  { accessorKey: 'is_used', header: 'Result', cell: ({ row }) => <ResultCell isUsed={row.getValue('is_used') as boolean | undefined} /> },
  { id: 'actions', header: 'Actions', cell: ({ row }) => (<ParticipantsActionsCell id={row.getValue('id') as string} code={row.getValue('code') as number | string | undefined} />) },
];
