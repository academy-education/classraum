'use client'

import React from 'react';
import { X } from 'lucide-react';
import { PortOneSettlement } from '@/types/subscription';

interface SettlementDetailModalProps {
  settlement: PortOneSettlement;
  onClose: () => void;
}

export function SettlementDetailModal({ settlement, onClose }: SettlementDetailModalProps) {
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Settlement Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Settlement ID</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Academy</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.academyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Settlement Date</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {formatDate(settlement.settlementDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Currency</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.settlementCurrency}</p>
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Amount Breakdown</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order Amount</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(settlement.amount.order, settlement.settlementCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Amount</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(settlement.amount.payment, settlement.settlementCurrency)}
                </span>
              </div>
              {settlement.amount.paymentSupply !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Supply Amount</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.paymentSupply, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.paymentTaxFree !== undefined && settlement.amount.paymentTaxFree > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tax-Free Amount</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.paymentTaxFree, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.vatAmount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">VAT Amount</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.vatAmount, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3"></div>
              <div className="flex justify-between items-center text-red-600">
                <span className="text-sm">Platform Fee</span>
                <span className="text-sm font-medium">
                  -{formatCurrency(settlement.amount.platformFee, settlement.settlementCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span className="text-sm">Platform Fee VAT</span>
                <span className="text-sm font-medium">
                  -{formatCurrency(settlement.amount.platformFeeVat, settlement.settlementCurrency)}
                </span>
              </div>
              {settlement.amount.additionalFee > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Additional Fee</span>
                  <span className="text-sm font-medium">
                    -{formatCurrency(settlement.amount.additionalFee, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.additionalFeeVat > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Additional Fee VAT</span>
                  <span className="text-sm font-medium">
                    -{formatCurrency(settlement.amount.additionalFeeVat, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.discount > 0 && (
                <>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Discount</span>
                    <span className="text-sm font-medium">
                      -{formatCurrency(settlement.amount.discount, settlement.settlementCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">Discount Share (Partner)</span>
                    <span className="text-sm font-medium">
                      -{formatCurrency(settlement.amount.discountShare, settlement.settlementCurrency)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-200 pt-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Final Settlement Amount</span>
                <span className="text-base font-bold text-blue-600">
                  {formatCurrency(settlement.amount.settlement, settlement.settlementCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {settlement.payment && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment ID</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.id}</p>
                </div>
                {settlement.payment.orderName && (
                  <div>
                    <p className="text-sm text-gray-600">Order Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.orderName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Payment Currency</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.currency}</p>
                </div>
                {settlement.payment.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600">Paid At</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDate(settlement.payment.paidAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
