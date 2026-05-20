'use client'

import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: string;
  paymentMethod?: string;
  description?: string;
}

interface RefundModalProps {
  invoice: Invoice;
  onClose: () => void;
  onRefundSuccess: () => void;
}

export function RefundModal({ invoice, onClose, onRefundSuccess }: RefundModalProps) {
  const { t, language } = useTranslation();
  const adminFetch = useAdminFetch();
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Handle amount input with comma formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // Remove existing commas

    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPartialAmount(value);
    }
  };

  // Format amount with commas for display
  const formatAmountDisplay = (value: string) => {
    if (!value) return '';
    return parseInt(value).toLocaleString(getDateLocale(language));
  };

  const handleRefund = async () => {
    // Validate inputs
    if (!reason.trim()) {
      setError(String(t('admin.subscriptions.refundReasonRequired')));
      return;
    }

    if (refundType === 'partial') {
      const amount = parseFloat(partialAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid refund amount');
        return;
      }
      if (amount > invoice.amount) {
        setError('Refund amount cannot exceed invoice amount');
        return;
      }
    }

    try {
      setIsProcessing(true);
      setError('');

      const requestBody: any = {
        invoiceId: invoice.id,
        reason: reason.trim(),
        refundType,
      };

      if (refundType === 'partial') {
        requestBody.amount = parseFloat(partialAmount);
      }

      const response = await adminFetch('/api/admin/subscriptions/refund', { method: 'POST', body: JSON.stringify(requestBody) });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Refund failed');
      }

      onRefundSuccess();
      onClose();
    } catch (err) {
      console.error('[RefundModal] Refund error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const maxRefundAmount = invoice.amount;
  const refundAmount = refundType === 'full' ? maxRefundAmount : parseFloat(partialAmount) || 0;

  return (
    <ModalShell
      onClose={onClose}
      title={String(t('admin.subscriptions.processRefund'))}
      disableBackdropClose={isProcessing}
      footer={
        <>
          <Button onClick={onClose} disabled={isProcessing} variant="outline">
            {String(t('admin.common.cancel'))}
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isProcessing || !reason.trim() || (refundType === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {String(t('admin.subscriptions.processing'))}
              </>
            ) : (
              String(t(refundType === 'full' ? 'admin.subscriptions.processFullRefund' : 'admin.subscriptions.processPartialRefund'))
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">{String(t('admin.subscriptions.refundWarning'))}</h3>
              <p className="text-sm text-amber-700 mt-1">
                {String(t('admin.subscriptions.refundWarningDesc'))}
              </p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{String(t('admin.subscriptions.invoiceId'))}</span>
              <span className="font-medium text-gray-900">{invoice.id}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{String(t('admin.subscriptions.originalAmount'))}</span>
              <span className="font-medium text-gray-900">{formatPrice(invoice.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{String(t('admin.subscriptions.paymentDate'))}</span>
              <span className="font-medium text-gray-900">{invoice.date.toLocaleDateString(getDateLocale(language))}</span>
            </div>
            {invoice.paymentMethod && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{String(t('admin.subscriptions.paymentMethodLabel'))}</span>
                <span className="font-medium text-gray-900">{invoice.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Refund Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">{String(t('admin.subscriptions.refundType'))}</label>

            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={(e) => setRefundType(e.target.value as 'full')}
                  disabled={isProcessing}
                  className="h-4 w-4 text-primary"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">{String(t('admin.subscriptions.fullRefundLabel'))}</div>
                  <div className="text-xs text-gray-500">{String(t('admin.subscriptions.fullRefundDesc', { amount: formatPrice(maxRefundAmount) }))}</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="refundType"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={(e) => setRefundType(e.target.value as 'partial')}
                  disabled={isProcessing}
                  className="h-4 w-4 text-primary"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">{String(t('admin.subscriptions.partialRefundLabel'))}</div>
                  <div className="text-xs text-gray-500">{String(t('admin.subscriptions.partialRefundDesc'))}</div>
                </div>
              </label>
            </div>
          </div>

          {/* Partial Amount Input */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{String(t('admin.subscriptions.refundAmountLabel'))}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 z-10">₩</span>
                <Input
                  type="text"
                  value={formatAmountDisplay(partialAmount)}
                  onChange={handleAmountChange}
                  disabled={isProcessing}
                  placeholder="0"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500">
                {String(t('admin.subscriptions.maxRefundable', { amount: formatPrice(maxRefundAmount) }))}
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{String(t('admin.subscriptions.refundReasonLabel'))}</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
              placeholder={String(t('admin.subscriptions.refundReasonPlaceholderModal'))}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              {String(t('admin.subscriptions.refundReasonHelp'))}
            </p>
          </div>

          {/* Refund Summary */}
          {(refundType === 'full' || (refundType === 'partial' && refundAmount > 0)) && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">{String(t('admin.subscriptions.refundAmountSummary'))}</span>
                <span className="text-lg font-semibold text-primary">{formatPrice(refundAmount)}</span>
              </div>
              {refundType === 'partial' && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-primary/80">{String(t('admin.subscriptions.remainingAmount'))}</span>
                  <span className="text-sm font-medium text-primary/80">
                    {formatPrice(maxRefundAmount - refundAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

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
