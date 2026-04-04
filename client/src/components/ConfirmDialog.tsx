import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
      <Card className="w-full max-w-sm mx-4 shadow-xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-foreground">{message}</p>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
            <Button
              variant={isDangerous ? 'destructive' : 'default'}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
