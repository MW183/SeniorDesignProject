import React, { useState } from 'react';
import Table from './Table';
import usePaginatedData from '../../hooks/usePaginatedData';
import Button from './Button';

export default function PaginatedTable({
  path,
  columns,
  initialFilters = {},
  pageSize = 20,
}: {
  path: string;
  columns: any[];
  initialFilters?: Record<string, any>;
  pageSize?: number;
}) {
  const { data, loading, page, setPage, hasMore, setFilters, filters } = usePaginatedData(path, initialFilters, pageSize);
  const [search, setSearch] = useState('');

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="px-3 py-2 rounded border bg-transparent" />
        <Button onClick={() => setFilters({ ...filters, search })}>Filter</Button>
        <Button variant="muted" onClick={() => { setSearch(''); setFilters({}); }}>Clear</Button>
      </div>

      <Table columns={columns} data={data} />

      <div className="flex items-center justify-between mt-3">
        <div>
          <Button variant="muted" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</Button>
        </div>
        <div className="text-sm text-slate-300">Page {page + 1}</div>
        <div>
          <Button variant="muted" size="sm" onClick={() => setPage(page + 1)} disabled={!hasMore}>Next</Button>
        </div>
      </div>
    </div>
  );
}
