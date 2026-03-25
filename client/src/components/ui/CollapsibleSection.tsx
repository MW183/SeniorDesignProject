import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  summary?: React.ReactNode;
  children: React.ReactNode;
  firstSection?: boolean;
}

export default function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  summary,
  children,
  firstSection = false,
}: CollapsibleSectionProps) {
  return (
    <div className={firstSection ? 'space-y-0' : 'pt-4 border-t border-slate-700'}>
      {!isExpanded && summary ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggle();
          }}
          className="text-left w-full hover:opacity-70 transition"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-300">{title}</span>
            <span className="text-xs text-slate-500 shrink-0">▸</span>
          </div>
          <div className="mt-2">{summary}</div>
        </button>
      ) : (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggle();
            }}
            className="text-left flex items-center justify-between gap-4 text-sm font-medium text-slate-300 hover:text-slate-200 transition w-full"
          >
            <span>{title}</span>
            <span className="text-xs text-slate-500 shrink-0">
              {isExpanded ? '▾' : '▸'}
            </span>
          </button>

          {isExpanded && <div className="mt-3 pl-4">{children}</div>}
        </div>
      )}
    </div>
  );
}
