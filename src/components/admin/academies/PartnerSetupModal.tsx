'use client'

import React, { useState, useEffect } from 'react';
import { Save, Banknote } from 'lucide-react';
import { TaxType, BankAccount } from '@/types/subscription';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { useDedupedToast } from '../useDedupedToast';
import { useTranslation } from '@/hooks/useTranslation';

interface PartnerSetupModalProps {
  academyId: string;
  academyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PartnerSetupModal({ academyId, academyName, onClose, onSuccess }: PartnerSetupModalProps) {
  const adminFetch = useAdminFetch();
  const { toast } = useDedupedToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partnerId: '',
    email: '',
    contractId: '',
    businessRegistrationNumber: '',
    taxType: 'GENERAL' as TaxType,
    bankAccount: {
      bank: '',
      accountNumber: '',
      accountHolder: '',
      currency: 'KRW',
    } as BankAccount,
  });

  useEffect(() => {
    loadExistingData();
  }, [academyId]);

  const loadExistingData = async () => {
    try {
      // Get session for auth token
      const response = await adminFetch(`/api/admin/academies/${academyId}/partner`);

      if (response.ok) {
        const data = await response.json();
        if (data.portone_partner_id) {
          setFormData({
            partnerId: data.portone_partner_id || '',
            email: '',
            contractId: data.portone_contract_id || '',
            businessRegistrationNumber: data.business_registration_number || '',
            taxType: data.tax_type || 'GENERAL',
            bankAccount: data.bank_account || {
              bank: '',
              accountNumber: '',
              accountHolder: '',
              currency: 'KRW',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminFetch(`/api/admin/academies/${academyId}/partner`, { method: 'POST',
        body: JSON.stringify({
          partnerId: formData.partnerId || undefined,
          email: formData.email,
          contractId: formData.contractId || undefined,
          businessRegistrationNumber: formData.businessRegistrationNumber || undefined,
          taxType: formData.taxType,
          bankAccount: {
            bank: formData.bankAccount.bank,
            accountNumber: formData.bankAccount.accountNumber,
            accountHolder: formData.bankAccount.accountHolder,
            currency: formData.bankAccount.currency || 'KRW',
          },
        }) });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || String(t('admin.failedToSavePartner')));
      }

      toast({ title: String(t('admin.partnerInfoSaved')), variant: 'success' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving partner info:', error);
      toast({ title: error.message || String(t('admin.failedToSavePartner')), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      size="2xl"
      title={
        <span className="inline-flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          {String(t('admin.academies.setupPortonePartner'))}
        </span>
      }
      description={academyName}
      disableBackdropClose={loading}
      bodyClassName="p-0"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={loading} variant="outline" className="flex-1">
            {String(t('admin.common.cancel'))}
          </Button>
          <Button type="submit" form="partner-setup-form" disabled={loading} variant="default" className="flex-1">
            <Save className="w-4 h-4" />
            {loading ? String(t('admin.common.saving')) : String(t('admin.academies.savePartnerInfo'))}
          </Button>
        </>
      }
    >
      <form id="partner-setup-form" onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Partner ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {String(t('admin.academies.partnerIdOptional'))}
            </label>
            <Input
              type="text"
              value={formData.partnerId}
              onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
              disabled={loading}
              placeholder={String(t('admin.academies.leaveEmptyAutoGenerate'))}
            />
            <p className="text-xs text-gray-500 break-all">
              {String(t('admin.academies.autoGenerateHint', { id: academyId }))}
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {String(t('admin.common.email'))} <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              placeholder="partner@academy.com"
              required
            />
          </div>

          {/* Contract ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {String(t('admin.academies.contractIdOptional'))}
            </label>
            <Input
              type="text"
              value={formData.contractId}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              disabled={loading}
              placeholder="contract_id"
            />
            <p className="text-xs text-gray-500">
              {String(t('admin.academies.defaultContractHint'))}
            </p>
          </div>

          {/* Business Registration Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {String(t('admin.academies.businessRegistrationNumber'))}
            </label>
            <Input
              type="text"
              value={formData.businessRegistrationNumber}
              onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
              disabled={loading}
              placeholder="123-45-67890"
            />
          </div>

          {/* Tax Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {String(t('admin.academies.taxType'))}
            </label>
            <Select
              value={formData.taxType}
              onValueChange={(value) => setFormData({ ...formData, taxType: value as TaxType })}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={String(t('admin.academies.selectTaxType'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">{String(t('admin.academies.taxGeneral'))}</SelectItem>
                <SelectItem value="SIMPLIFIED">{String(t('admin.academies.taxSimplified'))}</SelectItem>
                <SelectItem value="TAX_EXEMPT">{String(t('admin.academies.taxExempt'))}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bank Account Information */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">{String(t('admin.academies.bankAccountInformation'))}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {String(t('admin.academies.bank'))} <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={formData.bankAccount.bank}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, bank: value }
                    })}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={String(t('admin.academies.selectBank'))} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHINHAN">{String(t('admin.academies.banks.SHINHAN'))}</SelectItem>
                      <SelectItem value="WOORI">{String(t('admin.academies.banks.WOORI'))}</SelectItem>
                      <SelectItem value="KB">{String(t('admin.academies.banks.KB'))}</SelectItem>
                      <SelectItem value="HANA">{String(t('admin.academies.banks.HANA'))}</SelectItem>
                      <SelectItem value="NH">{String(t('admin.academies.banks.NH'))}</SelectItem>
                      <SelectItem value="IBK">{String(t('admin.academies.banks.IBK'))}</SelectItem>
                      <SelectItem value="SC">{String(t('admin.academies.banks.SC'))}</SelectItem>
                      <SelectItem value="CITI">{String(t('admin.academies.banks.CITI'))}</SelectItem>
                      <SelectItem value="KAKAO">{String(t('admin.academies.banks.KAKAO'))}</SelectItem>
                      <SelectItem value="TOSS">{String(t('admin.academies.banks.TOSS'))}</SelectItem>
                      <SelectItem value="K">{String(t('admin.academies.banks.K'))}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {String(t('admin.academies.currency'))}
                  </label>
                  <Input
                    type="text"
                    value={formData.bankAccount.currency}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, currency: e.target.value }
                    })}
                    disabled={loading}
                    placeholder="KRW"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {String(t('admin.academies.accountNumber'))} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.bankAccount.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                  })}
                  disabled={loading}
                  placeholder="123-456-789012"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {String(t('admin.academies.accountHolder'))} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.bankAccount.accountHolder}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, accountHolder: e.target.value }
                  })}
                  disabled={loading}
                  placeholder="홍길동"
                  required
                />
              </div>
            </div>
          </div>

      </form>
    </ModalShell>
  );
}
