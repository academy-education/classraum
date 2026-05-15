'use client'

import React, { useState } from 'react';
import { Building2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';

interface AddAcademyModalProps {
  onClose: () => void;
  // Parent receives the freshly-created academy info so it can surface the
  // onboarding URL (e.g. via toast / row action) without keeping this modal
  // open after submit.
  onSuccess: (created?: { name: string; onboardingUrl: string }) => void;
}

export function AddAcademyModal({ onClose, onSuccess }: AddAcademyModalProps) {
  const adminFetch = useAdminFetch();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    subscriptionTier: 'free'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Academy name is required');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const response = await adminFetch('/api/admin/academies', { method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          subscriptionTier: formData.subscriptionTier,
        }) })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.detail || body.error || 'Failed to create academy')
      }

      // Hand off to parent: refresh the list + surface the onboarding link.
      // The link remains accessible from the academy row's actions menu
      // ("Copy onboarding link") for as long as onboarding is pending.
      onSuccess({
        name: body.academy.name,
        onboardingUrl: body.academy.onboardingUrl,
      })
      onClose()
    } catch (err) {
      console.error('[AddAcademyModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create academy');
      setIsProcessing(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Add New Academy
        </span>
      }
      disableBackdropClose={isProcessing}
      bodyClassName="p-0"
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={isProcessing} variant="outline">
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isProcessing || !formData.name.trim()}
            variant="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Academy'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Academy Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isProcessing}
                placeholder="Enter academy name..."
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isProcessing}
                placeholder="Enter address..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subscription Tier</label>
            <Select
              value={formData.subscriptionTier}
              onValueChange={(value) => setFormData({ ...formData, subscriptionTier: value })}
              disabled={isProcessing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary">
              An onboarding link will be generated and copied for you. Send it to the academy&apos;s manager so they can sign up. You can copy it again from the row&apos;s actions menu.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}
      </form>
    </ModalShell>
  );
}
