import React from 'react';
import { Label } from '@/app/components/ui/label';
import { formatDateTimePK } from '@/app/lib/locale';
import {
  History,
  ChevronUp,
  ChevronDown,
  Edit2,
  Plus,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';

interface ActivityChangeHistoryProps {
  expanded: boolean;
  onToggle: () => void;
  changeHistory: Array<{
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    changeType: 'added' | 'removed' | 'modified';
  }>;
}

export function ActivityChangeHistory({
  expanded,
  onToggle,
  changeHistory,
}: ActivityChangeHistoryProps) {
  
  const formatTimestamp = (timestamp: string) => {
    return formatDateTimePK(timestamp);
  };

  const getFieldLabel = (field: string) => {
    if (field === 'Tentative Status') return 'Tentative Status';
    if (field === 'Follow-Up Outcome') return 'Follow-Up Outcome';
    return field;
  };

  const getDisplayValue = (value: string) => {
    if (!value) return '(empty)';
    if (value === 'Tentative Hold Active') return 'Tentative hold active';
    return value;
  };

  const getChangeIcon = (changeType: 'added' | 'removed' | 'modified') => {
    switch (changeType) {
      case 'added':
        return <Plus className="size-4 text-green-600" />;
      case 'removed':
        return <Trash2 className="size-4 text-red-600" />;
      case 'modified':
        return <Edit2 className="size-4 text-blue-600" />;
      default:
        return <RefreshCw className="size-4 text-gray-600" />;
    }
  };

  const getChangeColor = (changeType: 'added' | 'removed' | 'modified') => {
    switch (changeType) {
      case 'added':
        return 'border-l-green-500 bg-green-50/50';
      case 'removed':
        return 'border-l-red-500 bg-red-50/50';
      case 'modified':
        return 'border-l-blue-500 bg-blue-50/50';
      default:
        return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  return (
    <div className="bg-white border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <History className="size-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Activity & Change History</h3>
          <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
            Auto-tracked
          </span>
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {changeHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded mt-3">
              <Clock className="size-8 mx-auto mb-2 text-gray-300" />
              <p>No changes recorded yet</p>
              <p className="text-xs mt-1">All modifications will be automatically tracked here</p>
            </div>
          ) : (
            <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
              {changeHistory.slice().reverse().map((change, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-3 rounded ${getChangeColor(change.changeType)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getChangeIcon(change.changeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                          {getFieldLabel(change.field)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(change.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        {change.changeType === 'added' && (
                          <div className="text-green-800">
                            <span className="font-medium">Added:</span> {getDisplayValue(change.newValue)}
                          </div>
                        )}
                        {change.changeType === 'removed' && (
                          <div className="text-red-800">
                            <span className="font-medium">Removed:</span> {getDisplayValue(change.oldValue)}
                          </div>
                        )}
                        {change.changeType === 'modified' && (
                          <div className="text-blue-800">
                            <div>
                              <span className="font-medium">From:</span>{' '}
                              <span className="line-through text-gray-600">{getDisplayValue(change.oldValue)}</span>
                            </div>
                            <div>
                              <span className="font-medium">To:</span>{' '}
                              <span className="text-blue-900 font-medium">{getDisplayValue(change.newValue)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 mt-1">
                        Changed by: <span className="font-medium">{change.changedBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
