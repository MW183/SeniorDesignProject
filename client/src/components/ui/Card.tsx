import React from 'react';
import clsx from 'clsx';

export default function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-6 bg-white/5 dark:bg-white/3 rounded-lg shadow-sm', className)} {...rest}>
      {children}
    </div>
  );
}
