import React from 'react';

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export default function Table<T>({
  columns,
  data,
  rowKey = 'id',
}: {
  columns: Column<T>[];
  data: T[];
  rowKey?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-b-inherit">
            {columns.map(c => (
              <th key={c.key} className={c.className ?? 'text-left pb-2 px-2'}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={row[rowKey]} className="odd:bg-auto">
              {columns.map(c => (
                <td key={c.key} className="py-2 px-2 align-top">
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
