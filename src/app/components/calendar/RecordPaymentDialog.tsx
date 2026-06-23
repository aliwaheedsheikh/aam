import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  CreditCard,
  Banknote,
  Building2,
  Check as CheckIcon,
  Upload,
  X,
  AlertCircle,
  Receipt,
} from 'lucide-react';

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (paymentData: any) => void;
  bookingId: string;
  balanceDue: number;
}

export function RecordPaymentDialog({
  open,
  onClose,
  onSave,
  bookingId,
  balanceDue,
}: RecordPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online-transfer' | 'cheque' | 'card'>('cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Online Transfer Fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  
  // Cheque Fields
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  
  // Card Fields
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
  const [last4Digits, setLast4Digits] = useState('');
  const [approvalCode, setApprovalCode] = useState('');

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview('');
  };

  const handleSave = () => {
    const paymentData: any = {
      bookingId,
      amount: parseFloat(amount),
      paymentDate,
      paymentMethod,
      notes,
    };

    // Add method-specific data
    if (paymentMethod === 'online-transfer') {
      paymentData.bankDetails = {
        bankName,
        accountNumber,
        transactionId,
        screenshot: screenshot ? screenshot.name : null,
      };
    } else if (paymentMethod === 'cheque') {
      paymentData.chequeDetails = {
        chequeNumber,
        bank: chequeBank,
        chequeDate,
      };
    } else if (paymentMethod === 'card') {
      paymentData.cardDetails = {
        cardType,
        last4Digits,
        approvalCode,
      };
    }

    onSave(paymentData);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
    setBankName('');
    setAccountNumber('');
    setTransactionId('');
    setScreenshot(null);
    setScreenshotPreview('');
    setChequeNumber('');
    setChequeBank('');
    setChequeDate('');
    setLast4Digits('');
    setApprovalCode('');
  };

  const isFormValid = () => {
    const baseValid = amount && parseFloat(amount) > 0 && paymentDate;
    
    if (paymentMethod === 'online-transfer') {
      return baseValid && bankName && transactionId;
    } else if (paymentMethod === 'cheque') {
      return baseValid && chequeNumber && chequeBank && chequeDate;
    } else if (paymentMethod === 'card') {
      return baseValid && last4Digits && approvalCode;
    }
    
    return baseValid;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="size-6 text-green-600" />
            Record Payment Receipt
          </DialogTitle>
          <DialogDescription>
            Booking ID: {bookingId} | Balance Due: PKR {balanceDue.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`size-6 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium">Cash</div>
                  <div className="text-xs text-gray-500">Physical cash payment</div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('online-transfer')}
                className={`p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                  paymentMethod === 'online-transfer'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 className={`size-6 ${paymentMethod === 'online-transfer' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium">Online Transfer</div>
                  <div className="text-xs text-gray-500">Bank transfer / online</div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('cheque')}
                className={`p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                  paymentMethod === 'cheque'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CheckIcon className={`size-6 ${paymentMethod === 'cheque' ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium">Cheque</div>
                  <div className="text-xs text-gray-500">Bank cheque payment</div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                  paymentMethod === 'card'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`size-6 ${paymentMethod === 'card' ? 'text-orange-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium">Card</div>
                  <div className="text-xs text-gray-500">Credit / Debit card</div>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Payment Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Payment Amount (PKR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
              />
              {amount && parseFloat(amount) > balanceDue && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="size-3" />
                  Amount exceeds balance due
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Method-Specific Fields */}
          {paymentMethod === 'online-transfer' && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <Building2 className="size-5" />
                Online Transfer Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    Bank Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Meezan Bank"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number (Optional)</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Last 4 digits"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionId">
                  Transaction ID / Reference Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction reference"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label htmlFor="screenshot">Transaction Screenshot (Optional)</Label>
                {!screenshotPreview ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    <label htmlFor="screenshot" className="cursor-pointer">
                      <Upload className="size-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600">
                        Click to upload screenshot
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 10MB
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative border-2 border-blue-300 rounded-lg p-2">
                    <img
                      src={screenshotPreview}
                      alt="Transaction screenshot"
                      className="w-full h-48 object-contain rounded"
                    />
                    <button
                      onClick={handleRemoveScreenshot}
                      className="absolute top-4 right-4 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentMethod === 'cheque' && (
            <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <CheckIcon className="size-5" />
                Cheque Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">
                    Cheque Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="chequeNumber"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="Enter cheque number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeBank">
                    Bank Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="chequeBank"
                    value={chequeBank}
                    onChange={(e) => setChequeBank(e.target.value)}
                    placeholder="e.g., HBL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chequeDate">
                  Cheque Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="chequeDate"
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                <CreditCard className="size-5" />
                Card Payment Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select value={cardType} onValueChange={(val: any) => setCardType(val)}>
                    <SelectTrigger id="cardType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="debit">Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last4Digits">
                    Last 4 Digits <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last4Digits"
                    value={last4Digits}
                    onChange={(e) => setLast4Digits(e.target.value)}
                    placeholder="****"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalCode">
                  Approval / Authorization Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="approvalCode"
                  value={approvalCode}
                  onChange={(e) => setApprovalCode(e.target.value)}
                  placeholder="Enter approval code"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this payment..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Receipt className="size-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
