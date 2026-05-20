'use client'

import React from 'react';
import { PortOneSettlement } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { ModalShell } from '../ModalShell';
import { useTranslation } from '@/hooks/useTranslation';
import { getDateLocale } from '@/utils/dateUtils';

interface SettlementDetailModalProps {
  settlement: PortOneSettlement;
  onClose: () => void;
}

export function SettlementDetailModal({ settlement, onClose }: SettlementDetailModalProps) {
  const { t, language } = useTranslation();

  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat(getDateLocale(language), {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(getDateLocale(language), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ModalShell
      onClose={onClose}
      title={String(t('admin.settlements.settlementDetails'))}
      size="2xl"
      footer={
        <Button onClick={onClose} variant="default" className="w-full">
          {String(t('admin.common.close'))}
        </Button>
      }
    >
      <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">{String(t('admin.settlements.basicInformation'))}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.settlementIdLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.academyLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.academyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.typeLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.statusLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.settlementDateLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {formatDate(settlement.settlementDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{String(t('admin.settlements.currencyLabel'))}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{settlement.settlementCurrency}</p>
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">{String(t('admin.settlements.amountBreakdown'))}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{String(t('admin.settlements.orderAmount'))}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(settlement.amount.order, settlement.settlementCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{String(t('admin.settlements.paymentAmount'))}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(settlement.amount.payment, settlement.settlementCurrency)}
                </span>
              </div>
              {settlement.amount.paymentSupply !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{String(t('admin.settlements.paymentSupplyAmount'))}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.paymentSupply, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.paymentTaxFree !== undefined && settlement.amount.paymentTaxFree > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{String(t('admin.settlements.taxFreeAmount'))}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.paymentTaxFree, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.vatAmount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{String(t('admin.settlements.vatAmount'))}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.amount.vatAmount, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3"></div>
              <div className="flex justify-between items-center text-rose-600">
                <span className="text-sm">{String(t('admin.settlements.platformFee'))}</span>
                <span className="text-sm font-medium">
                  -{formatCurrency(settlement.amount.platformFee, settlement.settlementCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span className="text-sm">{String(t('admin.settlements.platformFeeVat'))}</span>
                <span className="text-sm font-medium">
                  -{formatCurrency(settlement.amount.platformFeeVat, settlement.settlementCurrency)}
                </span>
              </div>
              {settlement.amount.additionalFee > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="text-sm">{String(t('admin.settlements.additionalFee'))}</span>
                  <span className="text-sm font-medium">
                    -{formatCurrency(settlement.amount.additionalFee, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.additionalFeeVat > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="text-sm">{String(t('admin.settlements.additionalFeeVat'))}</span>
                  <span className="text-sm font-medium">
                    -{formatCurrency(settlement.amount.additionalFeeVat, settlement.settlementCurrency)}
                  </span>
                </div>
              )}
              {settlement.amount.discount > 0 && (
                <>
                  <div className="flex justify-between items-center text-rose-600">
                    <span className="text-sm">{String(t('admin.settlements.discount'))}</span>
                    <span className="text-sm font-medium">
                      -{formatCurrency(settlement.amount.discount, settlement.settlementCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600">
                    <span className="text-sm">{String(t('admin.settlements.discountShare'))}</span>
                    <span className="text-sm font-medium">
                      -{formatCurrency(settlement.amount.discountShare, settlement.settlementCurrency)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-200 pt-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">{String(t('admin.settlements.finalSettlementAmount'))}</span>
                <span className="text-base font-bold text-[#1f6fc7]">
                  {formatCurrency(settlement.amount.settlement, settlement.settlementCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {settlement.payment && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">{String(t('admin.settlements.paymentInformation'))}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{String(t('admin.settlements.paymentId'))}</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.id}</p>
                </div>
                {settlement.payment.orderName && (
                  <div>
                    <p className="text-sm text-gray-600">{String(t('admin.settlements.orderName'))}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.orderName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">{String(t('admin.settlements.paymentCurrency'))}</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{settlement.payment.currency}</p>
                </div>
                {settlement.payment.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600">{String(t('admin.settlements.paidAt'))}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDate(settlement.payment.paidAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </ModalShell>
  );
}
