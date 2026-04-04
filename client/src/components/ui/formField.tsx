import React from 'react';
import clsx from 'clsx';

type FormFieldProps = {
  label: string;
  id?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * FormField - Labeled form field wrapper with optional error message
 * @param {Object} props - FormField props
 * @param {string} props.label - Field label text
 * @param {string} [props.id] - HTML id for label association
 * @param {string} [props.error] - Error message to display
 * @param {React.ReactNode} props.children - Form input component(s)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Rendered form field with label, input, and optional error
 * @example
 * <FormField label="Email" id="email" error={errors.email}>
 *   <Input type="email" id="email" {...register('email')} />
 * </FormField>
 */
export default function FormField({ label, id, error, children, className }: FormFieldProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-black">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
