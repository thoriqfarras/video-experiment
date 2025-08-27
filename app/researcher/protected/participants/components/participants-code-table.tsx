'use client';

import { DataTable } from './data-table';
import { columns } from '../columns';
import { axiosService } from '@/lib/axios/axiosService';
import { useQuery } from '@tanstack/react-query';

export default function ParticipantCodesTable() {
  const { data } = useQuery({
    queryKey: ['participantCodes'],
    queryFn: async () => {
      const response = await axiosService.get('/api/researcher/participants');
      console.log(response.data);
      return response.data;
    },
  });

  return <DataTable data={data ?? []} columns={columns} />;
}
