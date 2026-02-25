import React from 'react';
import clsx from 'clsx';

export default function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full px-3 py-2 rounded-md border border-slate-600 bg-slate-900/50',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
        'placeholder:text-slate-500',
        'transition-colors',
        className
      )}
      {...rest}
    />
  );
}
