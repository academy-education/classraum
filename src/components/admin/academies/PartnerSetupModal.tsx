'use client'

import React, { useState, useEffect } from 'react';
import { X, Save, Banknote } from 'lucide-react';
import { TaxType, BankAccount } from '@/types/subscription';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PartnerSetupModalProps {
  academyId: string;
  academyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PartnerSetupModal({ academyId, academyName, onClose, onSuccess }: PartnerSetupModalProps) {
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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[PartnerSetupModal] No session found');
        return;
      }

      const response = await fetch(`/api/admin/academies/${academyId}/partner`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

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
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/academies/${academyId}/partner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save partner info');
      }

      alert('Partner information saved successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving partner info:', error);
      alert(error.message || 'Failed to save partner information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Banknote className="h-6 w-6 text-primary600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Setup PortOne Partner</h2>
              <p className="text-sm text-gray-500">{academyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Partner ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Partner ID (Optional)
            </label>
            <input
              type="text"
              value={formData.partnerId}
              onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
              disabled={loading}
              placeholder="Leave empty to auto-generate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500">
              If empty, will be auto-generated as academy_{academyId}
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              placeholder="partner@academy.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
          </div>

          {/* Contract ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Contract ID (Optional)
            </label>
            <input
              type="text"
              value={formData.contractId}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              disabled={loading}
              placeholder="contract_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500">
              Default contract to use for settlements
            </p>
          </div>

          {/* Business Registration Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Business Registration Number
            </label>
            <input
              type="text"
              value={formData.businessRegistrationNumber}
              onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
              disabled={loading}
              placeholder="123-45-67890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
          </div>

          {/* Tax Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tax Type
            </label>
            <Select
              value={formData.taxType}
              onValueChange={(value) => setFormData({ ...formData, taxType: value as TaxType })}
              disabled={loading}
            >
              <SelectTrigger className="!h-10 w-full rounded-lg border border-gray-300 bg-transparent focus:border-primary500 focus-visible:border-primary500 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary500 py-2 px-3">
                <SelectValue placeholder="Select tax type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General (일반과세)</SelectItem>
                <SelectItem value="SIMPLIFIED">Simplified (간이과세)</SelectItem>
                <SelectItem value="TAX_EXEMPT">Tax Exempt (면세)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bank Account Information */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Bank Account Information</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Bank <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.bankAccount.bank}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, bank: value }
                    })}
                    disabled={loading}
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-gray-300 bg-transparent focus:border-primary500 focus-visible:border-primary500 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary500 py-2 px-3">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHINHAN">Shinhan Bank</SelectItem>
                      <SelectItem value="WOORI">Woori Bank</SelectItem>
                      <SelectItem value="KB">KB Kookmin Bank</SelectItem>
                      <SelectItem value="HANA">Hana Bank</SelectItem>
                      <SelectItem value="NH">NH Bank</SelectItem>
                      <SelectItem value="IBK">IBK Bank</SelectItem>
                      <SelectItem value="SC">SC Bank</SelectItem>
                      <SelectItem value="CITI">Citi Bank</SelectItem>
                      <SelectItem value="KAKAO">Kakao Bank</SelectItem>
                      <SelectItem value="TOSS">Toss Bank</SelectItem>
                      <SelectItem value="K">K Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount.currency}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, currency: e.target.value }
                    })}
                    disabled={loading}
                    placeholder="KRW"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                  })}
                  disabled={loading}
                  placeholder="123-456-789012"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Account Holder <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.accountHolder}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, accountHolder: e.target.value }
                  })}
                  disabled={loading}
                  placeholder="홍길동"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary600 border border-transparent rounded-md hover:bg-primary700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Partner Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
