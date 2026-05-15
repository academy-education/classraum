'use client'

import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalShell } from '../ModalShell';
import { Textarea } from '@/components/ui/textarea';

interface SuspendReasonModalProps {
  academyName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function SuspendReasonModal({ academyName, onClose, onConfirm }: SuspendReasonModalProps) {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      console.error('[SuspendReasonModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to suspend academy');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModalShell
      onClose={isProcessing ? () => {} : onClose}
      title="Suspend Academy"
      disableBackdropClose={isProcessing}
      footer={
        <>
          <Button onClick={onClose} disabled={isProcessing} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !reason.trim()}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suspending...
              </>
            ) : (
              'Confirm Suspension'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-rose-800">Warning</h3>
            <p className="text-sm text-rose-700 mt-1">
              You are about to suspend <span className="font-semibold">{academyName}</span>.
              This will restrict access to their account until unsuspended.
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Suspension Reason *</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isProcessing}
            placeholder="Provide a detailed reason for suspension..."
            rows={4}
          />
          <p className="text-xs text-gray-500">
            This reason will be recorded and may be visible to the academy
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
