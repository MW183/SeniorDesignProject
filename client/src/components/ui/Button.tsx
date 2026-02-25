import React from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'muted' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type AsProp<E extends React.ElementType> = { as?: E };

type ButtonOwnProps = {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

type ButtonProps<E extends React.ElementType> = ButtonOwnProps &
  AsProp<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof ButtonOwnProps>;

export default function Button<E extends React.ElementType = 'button'>(
  { children, variant = 'primary', size = 'md', as, className, ...rest }: ButtonProps<E>
) {
  const Comp = (as || 'button') as React.ElementType;

  const base = 'inline-flex items-center justify-center rounded-md font-medium';
  const variants: Record<Variant, string> = {
    primary: 'bg-sky-600 text-white hover:bg-sky-500',
    muted: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  const sizes: Record<Size, string> = {
    sm: 'text-sm px-2 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-3',
  };

  return (
    // `rest` is typed as props for the chosen element type
    <Comp {...(rest as any)} className={clsx(base, variants[variant], sizes[size], className)}>
      {children}
    </Comp>
  );
}
