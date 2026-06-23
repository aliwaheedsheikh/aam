import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Plus, Trash2, Maximize } from 'lucide-react';
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

interface CompactAccordionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  summary?: string | React.ReactNode;
  children: React.ReactNode;
}

export function CompactAccordion({ title, isExpanded, onToggle, summary, children }: CompactAccordionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {!isExpanded && summary && (
            <span className="text-xs text-gray-600 ml-2">{summary}</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-gray-600" />
        ) : (
          <ChevronDown className="size-4 text-gray-600" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

interface ExpandableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  previewLength?: number;
}

export function ExpandableTextarea({ value, onChange, placeholder, previewLength = 80 }: ExpandableTextareaProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors min-h-[40px] flex items-center justify-between group"
      >
        <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? (value.length > previewLength ? `${value.slice(0, previewLength)}...` : value) : placeholder}
        </span>
        <Maximize className="size-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="text-sm"
        autoFocus
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setIsExpanded(false)}
      >
        Collapse
      </Button>
    </div>
  );
}

interface ServiceRowProps {
  index: number;
  service: {
    service: string;
    quantity: string;
    rate: string;
    discount?: string;
  };
  onChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  showDiscount?: boolean;
}

export function ServiceRow({ index, service, onChange, onRemove, canRemove, showDiscount }: ServiceRowProps) {
  const amount = parseFloat(service.quantity || '0') * parseFloat(service.rate || '0');
  const finalAmount = showDiscount 
    ? amount - parseFloat(service.discount || '0')
    : amount;

  return (
    <div className="grid gap-2 items-center py-2 border-b last:border-b-0" style={{ gridTemplateColumns: showDiscount ? '3fr 1fr 1fr 1fr 1fr 40px' : '3fr 1fr 1fr 1fr 40px' }}>
      <Select
        value={service.service}
        onValueChange={(value) => onChange(index, 'service', value)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="waiters">Waiters</SelectItem>
          <SelectItem value="ladies_waiter">Ladies Waiter</SelectItem>
          <SelectItem value="extra_time">Extra Time Charges</SelectItem>
          <SelectItem value="violation">Violation Charges</SelectItem>
          <SelectItem value="cleaning">Cleaning Service</SelectItem>
          <SelectItem value="security">Security Service</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={service.quantity}
        onChange={(e) => onChange(index, 'quantity', e.target.value)}
        placeholder="Qty"
        className="h-9 text-sm text-right"
      />
      <Input
        type="number"
        value={service.rate}
        onChange={(e) => onChange(index, 'rate', e.target.value)}
        placeholder="Rate"
        className="h-9 text-sm text-right"
      />
      {showDiscount && (
        <Input
          type="number"
          value={service.discount}
          onChange={(e) => onChange(index, 'discount', e.target.value)}
          placeholder="Disc"
          className="h-9 text-sm text-right"
        />
      )}
      <div className="text-sm font-semibold text-right">
        {finalAmount.toLocaleString()}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="h-9 w-9 p-0"
      >
        <Trash2 className="size-4 text-red-600" />
      </Button>
    </div>
  );
}
