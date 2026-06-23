import React from 'react';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Target,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Phone,
  MessageCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CallLog {
  id: string;
  date: string;
  time: string;
  outcome: string;
  notes: string;
  nextCallbackDate?: string;
}

interface SimplifiedTentativeCRMProps {
  isLocked: boolean;
  expanded: boolean;
  onToggle: () => void;
  
  // Call History
  callLogs: CallLog[];
  setCallLogs: (logs: CallLog[]) => void;
  
  // Reason Not Confirmed
  reasonNotConfirmed: string;
  setReasonNotConfirmed: (value: string) => void;
  
  // Notes
  notes: string;
  setNotes: (value: string) => void;
}

export function SimplifiedTentativeCRM({
  isLocked,
  expanded,
  onToggle,
  callLogs,
  setCallLogs,
  reasonNotConfirmed,
  setReasonNotConfirmed,
  notes,
  setNotes,
}: SimplifiedTentativeCRMProps) {
  
  const addCallLog = () => {
    const newLog: CallLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      outcome: '',
      notes: '',
      nextCallbackDate: '',
    };
    setCallLogs([...callLogs, newLog]);
  };

  const removeCallLog = (id: string) => {
    setCallLogs(callLogs.filter(log => log.id !== id));
  };

  const updateCallLog = (id: string, field: keyof CallLog, value: string) => {
    setCallLogs(callLogs.map(log => 
      log.id === id ? { ...log, [field]: value } : log
    ));
  };

  return (
    <div className="bg-white border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="size-5 text-orange-700" />
          <h3 className="font-semibold text-gray-900">CRM & Follow-Up Tracking</h3>
          <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-medium">
            Tentative Only
          </span>
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 bg-gradient-to-r from-orange-50/30 to-yellow-50/30">
          
          {/* 1. Call Back History */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Phone className="size-5 text-blue-600" />
                Call Back History
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                disabled={isLocked}
                onClick={addCallLog}
              >
                <Plus className="size-3 mr-1" />
                Add Entry
              </Button>
            </div>

            {callLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                <Phone className="size-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium">No call history yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Entry" to log your first follow-up call</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callLogs.map((log, index) => (
                  <div key={log.id} className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        Call #{index + 1}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                        disabled={isLocked}
                        onClick={() => removeCallLog(log.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      {/* Date */}
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600 mb-1.5 block">Date</Label>
                        <Input
                          type="date"
                          value={log.date}
                          onChange={(e) => updateCallLog(log.id, 'date', e.target.value)}
                          className="h-9 text-sm"
                          disabled={isLocked}
                        />
                      </div>

                      {/* Time */}
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600 mb-1.5 block">Time</Label>
                        <Input
                          type="time"
                          value={log.time}
                          onChange={(e) => updateCallLog(log.id, 'time', e.target.value)}
                          className="h-9 text-sm"
                          disabled={isLocked}
                        />
                      </div>

                      {/* Outcome */}
                      <div className="col-span-4">
                        <Label className="text-xs text-gray-600 mb-1.5 block">Call Outcome</Label>
                        <Select
                          value={log.outcome}
                          onValueChange={(value) => updateCallLog(log.id, 'outcome', value)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interested">✅ Still Interested</SelectItem>
                            <SelectItem value="price-negotiating">���� Negotiating Price</SelectItem>
                            <SelectItem value="callback-requested">📞 Callback Requested</SelectItem>
                            <SelectItem value="thinking">🤔 Needs Time to Think</SelectItem>
                            <SelectItem value="no-answer">📵 No Answer</SelectItem>
                            <SelectItem value="not-interested">❌ Not Interested</SelectItem>
                            <SelectItem value="ready-to-book">🎉 Ready to Book</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Next Callback */}
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600 mb-1.5 block">Next Callback</Label>
                        <Input
                          type="date"
                          value={log.nextCallbackDate || ''}
                          onChange={(e) => updateCallLog(log.id, 'nextCallbackDate', e.target.value)}
                          className="h-9 text-sm"
                          disabled={isLocked}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      {/* Notes */}
                      <div className="col-span-12 mt-2">
                        <Label className="text-xs text-gray-600 mb-1.5 block">Notes</Label>
                        <Textarea
                          value={log.notes}
                          onChange={(e) => updateCallLog(log.id, 'notes', e.target.value)}
                          placeholder="What was discussed? Customer's concerns, requests, or feedback..."
                          rows={2}
                          className="text-sm"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Reason Not Confirmed */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <AlertCircle className="size-5 text-orange-600" />
              Reason Not Confirmed
            </Label>
            <Select 
              value={reasonNotConfirmed} 
              onValueChange={setReasonNotConfirmed} 
              disabled={isLocked}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Why hasn't customer confirmed yet?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-too-high">💸 Price Too High</SelectItem>
                <SelectItem value="considering-other-venues">🏛️ Considering Other Venues</SelectItem>
                <SelectItem value="need-time-to-decide">⏳ Needs Time to Decide</SelectItem>
                <SelectItem value="budget-constraints">💰 Budget Constraints</SelectItem>
                <SelectItem value="event-date-not-fixed">📅 Event Date Not Fixed</SelectItem>
                <SelectItem value="waiting-approval">👥 Waiting for Family/Partner Approval</SelectItem>
                <SelectItem value="menu-concerns">🍽️ Menu Concerns</SelectItem>
                <SelectItem value="capacity-mismatch">👥 Capacity Mismatch</SelectItem>
                <SelectItem value="location-issue">📍 Location Issue</SelectItem>
                <SelectItem value="venue-not-suitable">🏢 Venue Not Suitable</SelectItem>
                <SelectItem value="other">❓ Other Reason</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              Understanding customer hesitation helps in targeted follow-up
            </p>
          </div>

          {/* 3. Notes (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <FileText className="size-5 text-purple-600" />
              Notes (Optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General remarks, special requests, customer preferences, or any important context about this tentative booking..."
              rows={4}
              className="bg-white text-sm"
              disabled={isLocked}
            />
            <p className="text-xs text-gray-500">
              Add any additional information that might help convert this tentative to confirmed
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
            <Clock className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Follow-Up Best Practices:</p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• Call within 24 hours of initial inquiry</li>
                <li>• Log every interaction for complete history</li>
                <li>• Set next callback date immediately after each call</li>
                <li>• Address customer concerns in follow-up calls</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
