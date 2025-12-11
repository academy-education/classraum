'use client'

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
    return parseInt(value).toLocaleString('ko-KR');
  };

  const handleRefund = async () => {
    // Validate inputs
    if (!reason.trim()) {
      setError('Please provide a reason for the refund');
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

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No session found');
      }

      const requestBody: any = {
        invoiceId: invoice.id,
        reason: reason.trim(),
        refundType,
      };

      if (refundType === 'partial') {
        requestBody.amount = parseFloat(partialAmount);
      }

      const response = await fetch('/api/admin/subscriptions/refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Refund failed');
      }

      console.log('[RefundModal] Refund successful:', result);
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
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Process Refund</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This action will process a refund through PortOne. This action cannot be undone.
                Please verify all details before proceeding.
              </p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Invoice ID:</span>
              <span className="font-medium text-gray-900">{invoice.id}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Original Amount:</span>
              <span className="font-medium text-gray-900">{formatPrice(invoice.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Payment Date:</span>
              <span className="font-medium text-gray-900">{invoice.date.toLocaleDateString()}</span>
            </div>
            {invoice.paymentMethod && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium text-gray-900">{invoice.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Refund Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Refund Type</label>

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
                  <div className="text-sm font-medium text-gray-900">Full Refund</div>
                  <div className="text-xs text-gray-500">Refund the entire amount: {formatPrice(maxRefundAmount)}</div>
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
                  <div className="text-sm font-medium text-gray-900">Partial Refund</div>
                  <div className="text-xs text-gray-500">Refund a specific amount</div>
                </div>
              </label>
            </div>
          </div>

          {/* Partial Amount Input */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Refund Amount</label>
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
                Maximum refundable amount: {formatPrice(maxRefundAmount)}
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Refund Reason *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isProcessing}
              placeholder="Provide a reason for this refund..."
              rows={3}
            />
            <p className="text-xs text-gray-500">
              This reason will be recorded and visible in the invoice history
            </p>
          </div>

          {/* Refund Summary */}
          {(refundType === 'full' || (refundType === 'partial' && refundAmount > 0)) && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Refund Amount:</span>
                <span className="text-lg font-semibold text-primary">{formatPrice(refundAmount)}</span>
              </div>
              {refundType === 'partial' && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-primary/80">Remaining Amount:</span>
                  <span className="text-sm font-medium text-primary/80">
                    {formatPrice(maxRefundAmount - refundAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100">
          <Button
            onClick={onClose}
            disabled={isProcessing}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isProcessing || !reason.trim() || (refundType === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Process ${refundType === 'full' ? 'Full' : 'Partial'} Refund`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
