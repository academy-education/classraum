'use client'

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Activity,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  StickyNote,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Star,
  Loader2
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { useAdminFetch } from '../useAdminFetch';
import { ModalShell } from '../ModalShell';
import { useConfirm } from '../useConfirm';
import { useDedupedToast } from '../useDedupedToast';

interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isSuspended: boolean;
  subscriptionTier: string;
  createdAt: Date;
  totalUsers: number;
  monthlyRevenue: number;
  lastActive: Date;
}

interface AcademyDetailModalProps {
  academy: Academy;
  onClose: () => void;
}

interface AcademyNote {
  id: string;
  academy_id: string;
  admin_user_id: string;
  note_type: string;
  content: string;
  tags: string[];
  is_important: boolean;
  created_at: string;
  updated_at: string;
  users: {
    name: string | null;
    email: string;
  };
}

export function AcademyDetailModal({ academy, onClose }: AcademyDetailModalProps) {
  const adminFetch = useAdminFetch();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { toast } = useDedupedToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'notes'>('overview');
  const [notes, setNotes] = useState<AcademyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<AcademyNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    note_type: 'general',
    content: '',
    tags: [] as string[],
    is_important: false
  });

  useEffect(() => {
    if (activeTab === 'notes') {
      loadNotes();
    }
  }, [activeTab]);

  const loadNotes = async () => {
    try {
      setLoadingNotes(true);
      const response = await adminFetch(`/api/admin/academy-notes?academy_id=${academy.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const result = await response.json();
      if (result.success) {
        setNotes(result.data);
      }
    } catch (error) {
      console.error('[Academy Notes] Error loading notes:', error);
      toast({ title: String(t('admin.academies.failedToLoadNotes')), variant: 'destructive' });
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNote = async () => {
    try {

      const url = editingNote
        ? '/api/admin/academy-notes'
        : '/api/admin/academy-notes';

      const body = editingNote
        ? { ...noteForm, id: editingNote.id }
        : { ...noteForm, academy_id: academy.id };

      const response = await adminFetch(url, {
        method: editingNote ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // Reset form and reload notes
      setNoteForm({
        note_type: 'general',
        content: '',
        tags: [],
        is_important: false
      });
      setShowAddNote(false);
      setEditingNote(null);
      loadNotes();
    } catch (error) {
      console.error('[Academy Notes] Error saving note:', error);
      toast({ title: String(t('admin.academies.failedToSaveNote')), variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const ok = await confirm({
      title: String(t('admin.academies.deleteThisNote')),
      description: String(t('admin.confirmDeleteNote')),
      variant: 'danger',
      confirmText: String(t('admin.common.delete')),
    });
    if (!ok) return;

    try {

      const response = await adminFetch(`/api/admin/academy-notes?id=${noteId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      loadNotes();
    } catch (error) {
      console.error('[Academy Notes] Error deleting note:', error);
      toast({ title: String(t('admin.academies.failedToDeleteNote')), variant: 'destructive' });
    }
  };

  const handleEditNote = (note: AcademyNote) => {
    setEditingNote(note);
    setNoteForm({
      note_type: note.note_type,
      content: note.content,
      tags: note.tags,
      is_important: note.is_important
    });
    setShowAddNote(true);
  };

  // Note category → tone mapping for the shared StatusBadge.
  const noteTypeTone = (type: string): StatusTone => {
    switch (type) {
      case 'billing':    return 'violet';
      case 'support':    return 'info';
      case 'compliance': return 'danger';
      case 'sales':      return 'active';
      default:           return 'muted';
    }
  };

  // Localized label for a note category.
  const noteTypeLabel = (type: string): string =>
    String(t(`admin.academies.noteTypes.${type}`));

  return (
    <ModalShell
      onClose={onClose}
      size="4xl"
      bodyClassName="p-0"
      title={
        <span className="inline-flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="flex flex-col">
            <span className="text-xl font-semibold text-gray-900">{academy.name}</span>
            <span className="text-sm font-normal text-gray-500">ID: {academy.id}</span>
          </span>
        </span>
      }
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label={String(t('admin.common.close'))}
        >
          {String(t('admin.common.close'))}
        </button>
      }
    >
      {/* Tabs */}
        {/* Tabs — same pill-underline pattern as AnalyticsDashboard /
            SystemDashboard / UserDetailModal so all tabbed surfaces read
            the same. */}
        <div className="border-b border-gray-100">
          <div className="flex gap-1 px-4">
            {(['overview', 'users', 'billing', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 px-3 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {String(t(`admin.academies.tabs.${tab}`))}
                {activeTab === tab && (
                  <span className="absolute -bottom-px left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">{String(t('admin.academies.contactInformation'))}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{academy.email}</span>
                    </div>
                    {academy.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="mr-2 h-4 w-4 text-gray-400" />
                        <span>{academy.phone}</span>
                      </div>
                    )}
                    {academy.address && (
                      <div className="flex items-center text-sm">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        <span>{academy.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">{String(t('admin.academies.accountStatus'))}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{String(t('admin.common.status'))}</span>
                      <StatusBadge tone={academy.isSuspended ? 'danger' : 'active'}>
                        {academy.isSuspended ? String(t('admin.common.suspended')) : String(t('admin.common.active'))}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{String(t('admin.academies.thSubscription'))}</span>
                      <StatusBadge tone={(academy.subscriptionTier === 'free' ? 'muted' : 'brand') as StatusTone}>
                        {academy.subscriptionTier}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{String(t('admin.academies.createdLabel'))}</span>
                      <span className="text-sm">{academy.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-primary" />
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-gray-900">{academy.totalUsers}</p>
                      <p className="text-xs text-gray-600">{String(t('admin.academies.csvTotalUsers'))}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{formatPrice(academy.monthlyRevenue)}</p>
                      <p className="text-xs text-gray-600">{String(t('admin.academies.monthly'))}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Clock className="h-8 w-8 text-amber-600" />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {String(t('admin.academies.hoursAgo', { hours: Math.floor((Date.now() - academy.lastActive.getTime()) / (1000 * 60 * 60)) }))}
                      </p>
                      <p className="text-xs text-gray-600">{String(t('admin.academies.thLastActive'))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">{String(t('admin.academies.userStatistics'))}</h3>
                <div>
                  <p className="text-sm text-gray-600">{String(t('admin.academies.csvTotalUsers'))}</p>
                  <p className="text-2xl font-semibold">{academy.totalUsers}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">{String(t('admin.academies.userInformation'))}</p>
                    <p className="text-amber-700 mt-1">
                      {String(t('admin.academies.userInfoBody', { count: academy.totalUsers }))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">{String(t('admin.academies.billingOverview'))}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{String(t('admin.academies.currentPlan'))}</p>
                    <p className="text-lg font-semibold capitalize">{academy.subscriptionTier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{String(t('admin.academies.csvMonthlyRevenue'))}</p>
                    <p className="text-lg font-semibold">{formatPrice(academy.monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{String(t('admin.academies.nextBilling'))}</p>
                    <p className="text-lg font-semibold text-gray-400">{String(t('admin.academies.noBillingData'))}</p>
                  </div>
                </div>
              </div>

              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{String(t('admin.academies.noInvoices'))}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {String(t('admin.academies.noInvoicesDesc'))}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Button */}
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900">{String(t('admin.academies.academyNotes'))}</h3>
                <button
                  onClick={() => {
                    setShowAddNote(!showAddNote);
                    setEditingNote(null);
                    setNoteForm({
                      note_type: 'general',
                      content: '',
                      tags: [],
                      is_important: false
                    });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {String(t('admin.academies.addNote'))}
                </button>
              </div>

              {/* Add/Edit Note Form */}
              {showAddNote && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {editingNote ? String(t('admin.academies.editNote')) : String(t('admin.academies.newNote'))}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {String(t('admin.academies.noteType'))}
                      </label>
                      <select
                        value={noteForm.note_type}
                        onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm"
                      >
                        <option value="general">{noteTypeLabel('general')}</option>
                        <option value="billing">{noteTypeLabel('billing')}</option>
                        <option value="support">{noteTypeLabel('support')}</option>
                        <option value="compliance">{noteTypeLabel('compliance')}</option>
                        <option value="sales">{noteTypeLabel('sales')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {String(t('admin.academies.content'))}
                      </label>
                      <textarea
                        value={noteForm.content}
                        onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm"
                        placeholder={String(t('admin.academies.enterNoteContent'))}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={noteForm.is_important}
                          onChange={(e) => setNoteForm({ ...noteForm, is_important: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary/30"
                        />
                        <Star className="w-4 h-4 text-amber-500" />
                        {String(t('admin.academies.markAsImportant'))}
                      </label>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowAddNote(false);
                          setEditingNote(null);
                          setNoteForm({
                            note_type: 'general',
                            content: '',
                            tags: [],
                            is_important: false
                          });
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {String(t('admin.common.cancel'))}
                      </button>
                      <button
                        onClick={handleSaveNote}
                        disabled={!noteForm.content.trim()}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingNote ? String(t('admin.academies.updateNote')) : String(t('admin.academies.saveNote'))}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {loadingNotes ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-gray-600">{String(t('admin.academies.loadingNotes'))}</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{String(t('admin.academies.noNotesYet'))}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {String(t('admin.academies.noNotesDesc'))}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={noteTypeTone(note.note_type)} size="sm">
                            {noteTypeLabel(note.note_type)}
                          </StatusBadge>
                          {note.is_important && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditNote(note)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-900 mb-2">{note.content}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{note.users?.name || note.users?.email || String(t('admin.common.unknownUser'))}</span>
                          <span>•</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {note.tags.map((tag, idx) => (
                              <span key={idx} className="bg-gray-100 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
    </ModalShell>
  );
}