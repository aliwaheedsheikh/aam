import { FormEvent, useState } from 'react';
import { Calendar, CheckCircle, Clock3, DollarSign, FileText, Phone, UserCheck, X } from 'lucide-react';
import { formatCurrencyPKR, formatDatePK, formatDateTimePK } from '../../../lib/locale';

export interface CallLog {
  id: string;
  callDate: Date;
  callerName: string;
  contactPersonName?: string;
  outcome: 'answered' | 'no-answer' | 'busy' | 'callback-scheduled' | 'payment-promised';
  notes: string;
  nextActionDate?: Date;
  paymentCommitment?: number;
  paymentPromiseDate?: Date;
  callDuration?: string;
}

interface CallLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  bookingId: string;
  existingLogs: CallLog[];
  onSaveLog: (log: Omit<CallLog, 'id' | 'callDate'>) => void;
  loggedInUserName: string;
  mode?: 'tentative' | 'payment';
}

const inputClass = 'h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600';

const outcomeOptions: Array<{ value: CallLog['outcome']; label: string; detail: string }> = [
  { value: 'answered', label: 'Answered', detail: 'Discussion completed' },
  { value: 'no-answer', label: 'No Answer', detail: 'Try again later' },
  { value: 'busy', label: 'Busy', detail: 'Customer asked to call later' },
  { value: 'callback-scheduled', label: 'Callback Scheduled', detail: 'Next follow-up date fixed' },
  { value: 'payment-promised', label: 'Payment Promised', detail: 'Amount or date committed' },
];

const getOutcomeBadgeClass = (outcome: CallLog['outcome']) => {
  if (outcome === 'answered') return 'bg-emerald-100 text-emerald-700';
  if (outcome === 'payment-promised') return 'bg-blue-100 text-blue-700';
  if (outcome === 'callback-scheduled') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

export function CallLogDialog({
  isOpen,
  onClose,
  customerName,
  bookingId,
  existingLogs,
  onSaveLog,
  loggedInUserName,
  mode = 'tentative',
}: CallLogDialogProps) {
  const [contactPersonName, setContactPersonName] = useState('');
  const [outcome, setOutcome] = useState<CallLog['outcome']>('answered');
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [paymentCommitment, setPaymentCommitment] = useState('');
  const [paymentPromiseDate, setPaymentPromiseDate] = useState('');
  const [callDuration, setCallDuration] = useState('');

  if (!isOpen) return null;

  const requiresNextAction = outcome === 'callback-scheduled' || outcome === 'no-answer' || outcome === 'busy';
  const requiresPaymentPromise = outcome === 'payment-promised';

  const resetForm = () => {
    setContactPersonName('');
    setOutcome('answered');
    setNotes('');
    setNextActionDate('');
    setPaymentCommitment('');
    setPaymentPromiseDate('');
    setCallDuration('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (requiresNextAction && !nextActionDate) {
      alert('Please select the next follow-up date.');
      return;
    }

    if (requiresPaymentPromise && !paymentPromiseDate) {
      alert('Please select the promised payment date.');
      return;
    }

    onSaveLog({
      callerName: loggedInUserName || 'Front Office Staff',
      contactPersonName: contactPersonName.trim() || undefined,
      outcome,
      notes: notes.trim(),
      nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined,
      paymentCommitment: paymentCommitment ? Number(paymentCommitment) : undefined,
      paymentPromiseDate: paymentPromiseDate ? new Date(paymentPromiseDate) : undefined,
      callDuration: callDuration.trim() || undefined,
    });

    resetForm();
  };

  const dialogTitle = mode === 'payment' ? 'Record Payment Follow-up' : 'Record Reservation Follow-up';
  const dialogHint = mode === 'payment'
    ? 'Save customer response, next contact date, and payment promise.'
    : 'Save callback outcome and keep the tentative reservation queue current.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-700">
              <Phone className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{dialogTitle}</h2>
              <p className="text-xs text-slate-500">{dialogHint}</p>
              <p className="mt-1 text-xs text-slate-600">
                {customerName} <span className="text-slate-400">|</span> {bookingId}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded p-2 text-slate-500 hover:bg-slate-100" aria-label="Close follow-up form">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 overflow-hidden grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Logged By</label>
                <div className="flex h-9 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <UserCheck className="size-4 text-slate-400" />
                  {loggedInUserName}
                </div>
              </div>

              <div>
                <label className={labelClass}>Talked To</label>
                <input
                  type="text"
                  value={contactPersonName}
                  onChange={(event) => setContactPersonName(event.target.value)}
                  placeholder="Customer or representative name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Call Outcome</label>
                <select
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as CallLog['outcome'])}
                  className={inputClass}
                >
                  {outcomeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Call Duration</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={callDuration}
                    onChange={(event) => setCallDuration(event.target.value)}
                    placeholder="Example: 5 minutes"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              {requiresNextAction ? (
                <div>
                  <label className={labelClass}>Next Follow-up Date</label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={nextActionDate}
                      onChange={(event) => setNextActionDate(event.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`${inputClass} pl-9`}
                      required
                    />
                  </div>
                </div>
              ) : null}

              {requiresPaymentPromise ? (
                <>
                  <div>
                    <label className={labelClass}>Payment Promise Date</label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={paymentPromiseDate}
                        onChange={(event) => setPaymentPromiseDate(event.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`${inputClass} pl-9`}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Promised Amount</label>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={paymentCommitment}
                        onChange={(event) => setPaymentCommitment(event.target.value)}
                        placeholder="Amount in PKR"
                        className={`${inputClass} pl-9`}
                        min="0"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-4">
              <label className={labelClass}>Follow-up Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Customer response, objections, promise, or next step"
                rows={5}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CheckCircle className="size-4" />
                Save Follow-up
              </button>
            </div>
          </form>

          <aside className="overflow-y-auto border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Previous Follow-ups</h3>
              <span className="text-xs text-slate-500">{existingLogs.length} logs</span>
            </div>

            {existingLogs.length > 0 ? (
              <div className="space-y-2">
                {existingLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-900">{formatDateTimePK(log.callDate)}</div>
                        <div className="text-xs text-slate-500">By {log.callerName}</div>
                        {log.contactPersonName ? (
                          <div className="text-xs text-slate-500">Talked to {log.contactPersonName}</div>
                        ) : null}
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${getOutcomeBadgeClass(log.outcome)}`}>
                        {log.outcome.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{log.notes}</p>
                    {log.nextActionDate || log.paymentPromiseDate || log.paymentCommitment ? (
                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        {log.nextActionDate ? <div>Next follow-up: {formatDatePK(log.nextActionDate)}</div> : null}
                        {log.paymentPromiseDate ? <div>Payment promised: {formatDatePK(log.paymentPromiseDate)}</div> : null}
                        {log.paymentCommitment ? <div>Amount: {formatCurrencyPKR(log.paymentCommitment)}</div> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center">
                <FileText className="mx-auto mb-2 size-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No follow-up history</p>
                <p className="mt-1 text-xs text-slate-500">This form will create the first callback record.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
