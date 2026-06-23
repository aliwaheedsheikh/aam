import React from 'react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Target,
  ChevronUp,
  ChevronDown,
  PhoneCall,
  AlertCircle,
  XCircle,
  TrendingUp,
  MessageCircle,
  Building2,
  CalendarClock,
  DollarSign,
  UserPlus,
  Bell,
  Phone,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  Zap
} from 'lucide-react';

interface DynamicCRMSectionProps {
  status: 'tentative' | 'pending_approval' | 'confirmed' | 'cancelled';
  isLocked: boolean;
  expanded: boolean;
  onToggle: () => void;
  
  // Tentative fields
  salesFollowUpStatus: string;
  setSalesFollowUpStatus: (value: string) => void;
  reasonNotInterested: string;
  setReasonNotInterested: (value: string) => void;
  customerRemarks: string;
  setCustomerRemarks: (value: string) => void;
  interestedBudget: string;
  setInterestedBudget: (value: string) => void;
  competitorConsidering: string;
  setCompetitorConsidering: (value: string) => void;
  assignedTo: string;
  setAssignedTo: (value: string) => void;
  followUpReminderDate: string;
  setFollowUpReminderDate: (value: string) => void;
  followUpReminderTime: string;
  setFollowUpReminderTime: (value: string) => void;
  
  // Confirmed fields
  postBookingStatus: string;
  setPostBookingStatus: (value: string) => void;
  pendingItems: {
    advancePayment: boolean;
    menuFinalization: boolean;
    decorSelection: boolean;
    balancePayment: boolean;
  };
  setPendingItems: (value: any) => void;
  advanceDueDate: string;
  setAdvanceDueDate: (value: string) => void;
  menuDueDate: string;
  setMenuDueDate: (value: string) => void;
  decorDueDate: string;
  setDecorDueDate: (value: string) => void;
  balanceDueDate: string;
  setBalanceDueDate: (value: string) => void;
  upsellingNotes: string;
  setUpsellingNotes: (value: string) => void;
  upsellingOpportunities: Array<{
    item: string;
    offered: boolean;
    accepted: boolean;
    notes: string;
  }>;
  setUpsellingOpportunities: (value: any) => void;
  
  // Common fields
  communicationLogs: Array<{
    date: string;
    time: string;
    type: 'whatsapp' | 'call' | 'email';
    contactedBy: string;
    notes: string;
  }>;
  setCommunicationLogs: (value: any) => void;
}

export function DynamicCRMSection({
  status,
  isLocked,
  expanded,
  onToggle,
  salesFollowUpStatus,
  setSalesFollowUpStatus,
  reasonNotInterested,
  setReasonNotInterested,
  customerRemarks,
  setCustomerRemarks,
  interestedBudget,
  setInterestedBudget,
  competitorConsidering,
  setCompetitorConsidering,
  assignedTo,
  setAssignedTo,
  followUpReminderDate,
  setFollowUpReminderDate,
  followUpReminderTime,
  setFollowUpReminderTime,
  postBookingStatus,
  setPostBookingStatus,
  pendingItems,
  setPendingItems,
  advanceDueDate,
  setAdvanceDueDate,
  menuDueDate,
  setMenuDueDate,
  decorDueDate,
  setDecorDueDate,
  balanceDueDate,
  setBalanceDueDate,
  upsellingNotes,
  setUpsellingNotes,
  upsellingOpportunities,
  setUpsellingOpportunities,
  communicationLogs,
  setCommunicationLogs,
}: DynamicCRMSectionProps) {
  
  return (
    <div className="bg-white border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Target className="size-5 text-indigo-700" />
          <h3 className="font-semibold text-gray-900">CRM & Follow-Up Tracking</h3>
          {status === 'tentative' && (
            <span className="ml-2 text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded">Sales Pipeline</span>
          )}
          {status === 'confirmed' && (
            <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Post-Booking Ops</span>
          )}
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 bg-gradient-to-r from-indigo-50/30 to-purple-50/30">
          
          {/* TENTATIVE STATUS - Sales-Focused Fields */}
          {status === 'tentative' && (
            <>
              {/* Follow-Up Status & Reason */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="salesFollowUpStatus">
                    Follow-Up Status
                  </Label>
                  <Select value={salesFollowUpStatus} onValueChange={setSalesFollowUpStatus} disabled={isLocked}>
                    <SelectTrigger id="salesFollowUpStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call-scheduled">
                        <div className="flex items-center gap-2">
                          <PhoneCall className="size-4 text-blue-600" />
                          Call Scheduled
                        </div>
                      </SelectItem>
                      <SelectItem value="price-concern">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-4 text-orange-600" />
                          Price Concern
                        </div>
                      </SelectItem>
                      <SelectItem value="no-response">
                        <div className="flex items-center gap-2">
                          <XCircle className="size-4 text-gray-600" />
                          No Response
                        </div>
                      </SelectItem>
                      <SelectItem value="interested">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="size-4 text-green-600" />
                          Highly Interested
                        </div>
                      </SelectItem>
                      <SelectItem value="negotiating">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-yellow-600" />
                          Negotiating Terms
                        </div>
                      </SelectItem>
                      <SelectItem value="site-visit-requested">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-purple-600" />
                          Site Visit Requested
                        </div>
                      </SelectItem>
                      <SelectItem value="ready-to-book">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="size-4 text-indigo-600" />
                          Ready to Book
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reasonNotInterested">
                    Reason Not Interested
                  </Label>
                  <Select value={reasonNotInterested} onValueChange={setReasonNotInterested} disabled={isLocked}>
                    <SelectTrigger id="reasonNotInterested">
                      <SelectValue placeholder="Select if not interested" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="too-expensive">Too Expensive</SelectItem>
                      <SelectItem value="booked-elsewhere">Booked Elsewhere</SelectItem>
                      <SelectItem value="postponed">Event Postponed</SelectItem>
                      <SelectItem value="cancelled">Event Cancelled</SelectItem>
                      <SelectItem value="venue-not-suitable">Venue Not Suitable</SelectItem>
                      <SelectItem value="location-issue">Location Issue</SelectItem>
                      <SelectItem value="capacity-mismatch">Capacity Mismatch</SelectItem>
                      <SelectItem value="date-unavailable">Date Not Available</SelectItem>
                      <SelectItem value="other">Other Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer Remarks */}
              <div className="space-y-2">
                <Label htmlFor="customerRemarks">
                  Customer Remarks
                </Label>
                <Textarea
                  id="customerRemarks"
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                  placeholder="Record customer's specific comments, concerns, special requests, or feedback..."
                  rows={3}
                  disabled={isLocked}
                />
              </div>

              {/* Budget & Competitor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interestedBudget">
                    Customer Budget
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      id="interestedBudget"
                      value={interestedBudget}
                      onChange={(e) => setInterestedBudget(e.target.value)}
                      placeholder="PKR 500,000"
                      className="pl-10"
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competitorConsidering">
                    Competitor Considering
                  </Label>
                  <Input
                    id="competitorConsidering"
                    value={competitorConsidering}
                    onChange={(e) => setCompetitorConsidering(e.target.value)}
                    placeholder="e.g., Pearl Continental, Avari"
                    disabled={isLocked}
                  />
                </div>
              </div>
            </>
          )}

          {/* CONFIRMED STATUS - Operations-Focused Fields */}
          {(status === 'confirmed' || status === 'pending_approval') && (
            <>
              {/* Post-Booking Status Overview */}
              <div className="pt-4 space-y-2">
                <Label htmlFor="postBookingStatus">
                  <div className="flex items-center gap-1.5">
                    <Package className="size-4 text-green-600" />
                    Post-Booking Status
                  </div>
                </Label>
                <Select value={postBookingStatus} onValueChange={setPostBookingStatus} disabled={isLocked}>
                  <SelectTrigger id="postBookingStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-pending">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-orange-600" />
                        All Items Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="advance-received">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-blue-600" />
                        Advance Received
                      </div>
                    </SelectItem>
                    <SelectItem value="menu-finalized">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-blue-600" />
                        Menu Finalized
                      </div>
                    </SelectItem>
                    <SelectItem value="all-confirmed">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-green-600" />
                        All Items Confirmed
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pending Items Checklist */}
              <div className="space-y-3 p-3 bg-white rounded-lg border border-green-200">
                <Label className="text-sm font-semibold text-gray-900">Pending Items Checklist</Label>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="advancePayment"
                        checked={!pendingItems.advancePayment}
                        onCheckedChange={(checked) => 
                          setPendingItems({ ...pendingItems, advancePayment: !checked })
                        }
                        disabled={isLocked}
                      />
                      <Label htmlFor="advancePayment" className="cursor-pointer">
                        Minimum Advance Payment
                      </Label>
                    </div>
                    <Input
                      type="date"
                      value={advanceDueDate}
                      onChange={(e) => setAdvanceDueDate(e.target.value)}
                      className="w-40 h-8 text-xs"
                      disabled={isLocked}
                      placeholder="Due date"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="menuFinalization"
                        checked={!pendingItems.menuFinalization}
                        onCheckedChange={(checked) => 
                          setPendingItems({ ...pendingItems, menuFinalization: !checked })
                        }
                        disabled={isLocked}
                      />
                      <Label htmlFor="menuFinalization" className="cursor-pointer">
                        Menu Finalization
                      </Label>
                    </div>
                    <Input
                      type="date"
                      value={menuDueDate}
                      onChange={(e) => setMenuDueDate(e.target.value)}
                      className="w-40 h-8 text-xs"
                      disabled={isLocked}
                      placeholder="Due date"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="decorSelection"
                        checked={!pendingItems.decorSelection}
                        onCheckedChange={(checked) => 
                          setPendingItems({ ...pendingItems, decorSelection: !checked })
                        }
                        disabled={isLocked}
                      />
                      <Label htmlFor="decorSelection" className="cursor-pointer">
                        Décor & Services Selection
                      </Label>
                    </div>
                    <Input
                      type="date"
                      value={decorDueDate}
                      onChange={(e) => setDecorDueDate(e.target.value)}
                      className="w-40 h-8 text-xs"
                      disabled={isLocked}
                      placeholder="Due date"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="balancePayment"
                        checked={!pendingItems.balancePayment}
                        onCheckedChange={(checked) => 
                          setPendingItems({ ...pendingItems, balancePayment: !checked })
                        }
                        disabled={isLocked}
                      />
                      <Label htmlFor="balancePayment" className="cursor-pointer">
                        Balance Payment
                      </Label>
                    </div>
                    <Input
                      type="date"
                      value={balanceDueDate}
                      onChange={(e) => setBalanceDueDate(e.target.value)}
                      className="w-40 h-8 text-xs"
                      disabled={isLocked}
                      placeholder="Due date"
                    />
                  </div>
                </div>
              </div>

              {/* Up-selling Opportunities */}
              <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-200">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-purple-600" />
                  Up-selling Opportunities
                </Label>
                
                <div className="space-y-2">
                  {upsellingOpportunities.map((opp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <div className="flex items-center gap-3 mb-2">
                        <Checkbox
                          id={`offered-${index}`}
                          checked={opp.offered}
                          onCheckedChange={(checked) => {
                            const newOpps = [...upsellingOpportunities];
                            newOpps[index].offered = !!checked;
                            setUpsellingOpportunities(newOpps);
                          }}
                          disabled={isLocked}
                        />
                        <Label htmlFor={`offered-${index}`} className="text-xs font-medium cursor-pointer flex-1">
                          {opp.item}
                        </Label>
                        {opp.offered && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`accepted-${index}`}
                              checked={opp.accepted}
                              onCheckedChange={(checked) => {
                                const newOpps = [...upsellingOpportunities];
                                newOpps[index].accepted = !!checked;
                                setUpsellingOpportunities(newOpps);
                              }}
                              disabled={isLocked}
                            />
                            <Label htmlFor={`accepted-${index}`} className="text-xs text-green-700 cursor-pointer">
                              Accepted
                            </Label>
                          </div>
                        )}
                      </div>
                      {opp.offered && (
                        <Input
                          value={opp.notes}
                          onChange={(e) => {
                            const newOpps = [...upsellingOpportunities];
                            newOpps[index].notes = e.target.value;
                            setUpsellingOpportunities(newOpps);
                          }}
                          placeholder="Notes about discussion..."
                          className="h-7 text-xs"
                          disabled={isLocked}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="upsellingNotes" className="text-xs">
                    General Up-selling Notes
                  </Label>
                  <Textarea
                    id="upsellingNotes"
                    value={upsellingNotes}
                    onChange={(e) => setUpsellingNotes(e.target.value)}
                    placeholder="Track discussions about premium packages, add-ons, or service upgrades..."
                    rows={2}
                    disabled={isLocked}
                    className="text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Assigned To & Follow-Up Reminder - COMMON FOR ALL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="size-4 text-indigo-600" />
                  {status === 'tentative' ? 'Assigned To (Sales)' : 'Assigned Manager'}
                </div>
              </Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isLocked}>
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Assign to team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager-ali">Ali Khan (Manager)</SelectItem>
                  <SelectItem value="planner-sara">Sara Ahmed (Event Planner)</SelectItem>
                  <SelectItem value="planner-bilal">Bilal Hussain (Event Planner)</SelectItem>
                  <SelectItem value="planner-fatima">Fatima Malik (Event Planner)</SelectItem>
                  <SelectItem value="sales-zain">Zain Abbas (Sales Executive)</SelectItem>
                  <SelectItem value="sales-ayesha">Ayesha Siddiqui (Sales Executive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followUpReminderDate">
                <div className="flex items-center gap-1.5">
                  <Bell className="size-4 text-indigo-600" />
                  Follow-Up Reminder
                </div>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="followUpReminderDate"
                  type="date"
                  value={followUpReminderDate}
                  onChange={(e) => setFollowUpReminderDate(e.target.value)}
                  className="flex-1"
                  disabled={isLocked}
                />
                <Input
                  type="time"
                  value={followUpReminderTime}
                  onChange={(e) => setFollowUpReminderTime(e.target.value)}
                  className="w-32"
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* Communication Logs - COMMON FOR ALL */}
          <div className="space-y-3 p-3 bg-white rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MessageCircle className="size-4 text-green-600" />
                Communication Logs
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isLocked}
                onClick={() => {
                  setCommunicationLogs([
                    ...communicationLogs,
                    {
                      date: new Date().toISOString().split('T')[0],
                      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                      type: 'call' as const,
                      contactedBy: '',
                      notes: '',
                    },
                  ]);
                }}
              >
                <Plus className="size-3 mr-1" />
                Add Log
              </Button>
            </div>

            {communicationLogs.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded">
                No communication logs yet. Click "Add Log" to record contact history.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {communicationLogs.map((log, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-2">
                        <Input
                          type="date"
                          value={log.date}
                          onChange={(e) => {
                            const newLogs = [...communicationLogs];
                            newLogs[index].date = e.target.value;
                            setCommunicationLogs(newLogs);
                          }}
                          className="h-8 text-xs"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="time"
                          value={log.time}
                          onChange={(e) => {
                            const newLogs = [...communicationLogs];
                            newLogs[index].time = e.target.value;
                            setCommunicationLogs(newLogs);
                          }}
                          className="h-8 text-xs"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={log.type}
                          onValueChange={(value: 'whatsapp' | 'call' | 'email') => {
                            const newLogs = [...communicationLogs];
                            newLogs[index].type = value;
                            setCommunicationLogs(newLogs);
                          }}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">
                              <div className="flex items-center gap-1.5">
                                <MessageCircle className="size-3 text-green-600" />
                                WhatsApp
                              </div>
                            </SelectItem>
                            <SelectItem value="call">
                              <div className="flex items-center gap-1.5">
                                <Phone className="size-3 text-blue-600" />
                                Call
                              </div>
                            </SelectItem>
                            <SelectItem value="email">
                              <div className="flex items-center gap-1.5">
                                <Mail className="size-3 text-purple-600" />
                                Email
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={log.contactedBy}
                          onChange={(e) => {
                            const newLogs = [...communicationLogs];
                            newLogs[index].contactedBy = e.target.value;
                            setCommunicationLogs(newLogs);
                          }}
                          placeholder="Staff name"
                          className="h-8 text-xs"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={log.notes}
                          onChange={(e) => {
                            const newLogs = [...communicationLogs];
                            newLogs[index].notes = e.target.value;
                            setCommunicationLogs(newLogs);
                          }}
                          placeholder="Notes about conversation..."
                          className="h-8 text-xs"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isLocked}
                          onClick={() => {
                            const newLogs = communicationLogs.filter((_, i) => i !== index);
                            setCommunicationLogs(newLogs);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
