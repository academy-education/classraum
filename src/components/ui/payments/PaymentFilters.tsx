import React, { useMemo } from 'react'
import { Search, Filter, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'

export interface PaymentFiltersProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  
  // Status filter
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  
  // Bulk actions
  selectedItems: Set<string>
  onBulkAction: (action: string) => void
  bulkActionsLoading?: boolean
  
  // Tab context for different filter options
  activeTab: 'one_time' | 'recurring' | 'plans'
}

const PaymentFiltersComponent: React.FC<PaymentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  selectedItems,
  onBulkAction,
  bulkActionsLoading = false,
  activeTab
}) => {
  const { t } = useTranslation()

  // Status options based on active tab
  const statusOptions = useMemo(() => {
    const commonOptions = [
      { value: 'all', label: t('common.all') }
    ]

    switch (activeTab) {
      case 'one_time':
        return [
          ...commonOptions,
          { value: 'pending', label: t('payments.status.pending') },
          { value: 'paid', label: t('payments.status.paid') },
          { value: 'overdue', label: t('payments.status.overdue') },
          { value: 'cancelled', label: t('payments.status.cancelled') }
        ]
      
      case 'recurring':
        return [
          ...commonOptions,
          { value: 'active', label: t('payments.status.active') },
          { value: 'paused', label: t('payments.status.paused') },
          { value: 'inactive', label: t('payments.status.inactive') }
        ]
      
      case 'plans':
        return [
          ...commonOptions,
          { value: 'active', label: t('payments.status.active') },
          { value: 'inactive', label: t('payments.status.inactive') }
        ]
      
      default:
        return commonOptions
    }
  }, [activeTab, t])

  // Bulk action options based on active tab and selection
  const bulkActionOptions = useMemo(() => {
    if (selectedItems.size === 0) return []

    const commonActions = [
      { value: 'export', label: t('common.export'), icon: '📊' }
    ]

    switch (activeTab) {
      case 'one_time':
        return [
          { value: 'mark_paid', label: t('payments.actions.markPaid'), icon: '✅' },
          { value: 'mark_pending', label: t('payments.actions.markPending'), icon: '⏳' },
          { value: 'send_reminder', label: t('payments.actions.sendReminder'), icon: '📧' },
          { value: 'delete', label: t('common.delete'), icon: '🗑️', danger: true },
          ...commonActions
        ]
      
      case 'recurring':
        return [
          { value: 'pause', label: t('payments.actions.pause'), icon: '⏸️' },
          { value: 'resume', label: t('payments.actions.resume'), icon: '▶️' },
          { value: 'update_amount', label: t('payments.actions.updateAmount'), icon: '💰' },
          { value: 'delete', label: t('common.delete'), icon: '🗑️', danger: true },
          ...commonActions
        ]
      
      case 'plans':
        return [
          { value: 'activate', label: t('payments.actions.activate'), icon: '🟢' },
          { value: 'deactivate', label: t('payments.actions.deactivate'), icon: '🔴' },
          { value: 'duplicate', label: t('payments.actions.duplicate'), icon: '📋' },
          { value: 'delete', label: t('common.delete'), icon: '🗑️', danger: true },
          ...commonActions
        ]
      
      default:
        return commonActions
    }
  }, [activeTab, selectedItems.size, t])

  // Get appropriate search placeholder
  const getSearchPlaceholder = () => {
    if (searchPlaceholder) return searchPlaceholder
    
    switch (activeTab) {
      case 'one_time':
        return t('payments.search.oneTime')
      case 'recurring':
        return t('payments.search.recurring')
      case 'plans':
        return t('payments.search.plans')
      default:
        return t('common.search')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Status Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('payments.filters.status')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Row */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">
              {t('common.selected', { count: selectedItems.size })}
            </span>
            <span className="text-xs text-blue-700">
              ({selectedItems.size} {selectedItems.size === 1 ? t('common.item') : t('common.items')})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action Buttons */}
            {bulkActionOptions.slice(0, 3).map((action) => (
              <Button
                key={action.value}
                size="sm"
                variant={action.danger ? "destructive" : "secondary"}
                onClick={() => onBulkAction(action.value)}
                disabled={bulkActionsLoading}
                className="text-xs"
              >
                <span className="mr-1">{action.icon}</span>
                {action.label}
              </Button>
            ))}

            {/* More Actions Dropdown */}
            {bulkActionOptions.length > 3 && (
              <Select onValueChange={(value) => onBulkAction(value)}>
                <SelectTrigger asChild>
                  <Button size="sm" variant="outline" disabled={bulkActionsLoading}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </SelectTrigger>
                <SelectContent>
                  {bulkActionOptions.slice(3).map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex items-center gap-2">
                        <span>{action.icon}</span>
                        <span className={action.danger ? 'text-red-600' : ''}>{action.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(searchQuery || statusFilter !== 'all') && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">{t('common.activeFilters')}:</span>
          
          {searchQuery && (
            <span className="px-2 py-1 bg-gray-100 rounded-md flex items-center gap-1">
              <Search className="w-3 h-3" />
              &quot;{searchQuery}&quot;
              <button
                onClick={() => onSearchChange('')}
                className="ml-1 text-gray-400 hover:text-gray-600"
                aria-label={t('common.clearSearch')}
              >
                ×
              </button>
            </span>
          )}
          
          {statusFilter !== 'all' && (
            <span className="px-2 py-1 bg-gray-100 rounded-md flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {statusOptions.find(opt => opt.value === statusFilter)?.label}
              <button
                onClick={() => onStatusFilterChange('all')}
                className="ml-1 text-gray-400 hover:text-gray-600"
                aria-label={t('common.clearFilter')}
              >
                ×
              </button>
            </span>
          )}
          
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                onSearchChange('')
                onStatusFilterChange('all')
              }}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {t('common.clearAll')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

PaymentFiltersComponent.displayName = 'PaymentFilters'

export const PaymentFilters = PaymentFiltersComponent
export default PaymentFilters