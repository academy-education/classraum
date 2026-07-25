'use client'

import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalShell } from '../ModalShell';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';

interface SuspendReasonModalProps {
  academyName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function SuspendReasonModal({ academyName, onClose, onConfirm }: SuspendReasonModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError(String(t('admin.academies.reasonRequired')));
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      console.error('[SuspendReasonModal] Error:', err);
      setError(err instanceof Error ? err.message : String(t('admin.academies.failedToSuspend')));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModalShell
      onClose={isProcessing ? () => {} : onClose}
      title={String(t('admin.academies.suspendModalTitle'))}
      disableBackdropClose={isProcessing}
      footer={
        <>
          <Button onClick={onClose} disabled={isProcessing} variant="outline">
            {String(t('admin.common.cancel'))}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !reason.trim()}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {String(t('admin.academies.suspending'))}
              </>
            ) : (
              String(t('admin.academies.confirmSuspension'))
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="bg-rose-50 ring-1 ring-rose-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-rose-800">{String(t('admin.academies.warning'))}</h3>
            <p className="text-sm text-rose-700 mt-1">
              {String(t('admin.academies.suspendWarningBody', { name: academyName }))}
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{String(t('admin.academies.reasonLabelRequired'))}</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isProcessing}
            placeholder={String(t('admin.academies.reasonPlaceholder'))}
            rows={4}
          />
          <p className="text-xs text-gray-500">
            {String(t('admin.academies.reasonHelp'))}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 ring-1 ring-rose-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
