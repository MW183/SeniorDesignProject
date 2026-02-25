import React from 'react';
import clsx from 'clsx';

type FormFieldProps = {
  label: string;
  id?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export default function FormField({ label, id, error, children, className }: FormFieldProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
