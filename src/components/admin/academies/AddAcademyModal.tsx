'use client'

import React, { useState } from 'react';
import { X, Building2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface AddAcademyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAcademyModal({ onClose, onSuccess }: AddAcademyModalProps) {
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

      console.log('[AddAcademyModal] Creating academy with data:', formData);

      // Create academy in database
      const { data, error: insertError } = await supabase
        .from('academies')
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          subscription_tier: formData.subscriptionTier
        })
        .select()
        .single();

      if (insertError) {
        console.error('[AddAcademyModal] Insert error:', insertError);
        throw insertError;
      }

      console.log('[AddAcademyModal] Academy created successfully:', data);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[AddAcademyModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create academy');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-primary600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Academy</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Academy Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Academy Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isProcessing}
                placeholder="Enter academy name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Address (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isProcessing}
                placeholder="Enter address..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Subscription Tier */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subscription Tier</label>
            <Select
              value={formData.subscriptionTier}
              onValueChange={(value) => setFormData({ ...formData, subscriptionTier: value })}
              disabled={isProcessing}
            >
              <SelectTrigger className="!h-10 w-full rounded-lg border border-gray-300 bg-transparent focus:border-primary500 focus-visible:border-primary500 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary500 py-2 px-3">
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

          {/* Info Message */}
          <div className="bg-primary/10 border border-primary200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-primary600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary700">
              A new academy will be created with the selected subscription tier. You can add managers, teachers, and students after creation.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isProcessing || !formData.name.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Academy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
