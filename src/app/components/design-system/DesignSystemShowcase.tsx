// Design System Showcase - Visual Reference Guide
// Use this component to see all design system elements in action

import {
  Amount,
  AmountCard,
  CurrencyInput,
  Icon,
  IconBadge,
  StatusBadge,
  StatusDot,
  PageTitle,
  SectionTitle,
  SubsectionTitle,
  CardTitle,
  FieldLabel,
  BodyText,
  Caption,
  TimePicker,
  formatTimeDisplay,
} from './index';

import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

export function DesignSystemShowcase() {
  const [amount, setAmount] = useState('25000');
  const [time, setTime] = useState('14:00');

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-12 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <PageTitle>VenueOps ERP Design System</PageTitle>
        <Caption className="mt-2">
          Enterprise design system for Banquet & Catering operations
        </Caption>
      </div>

      {/* Currency System */}
      <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-6">
        <SectionTitle>💰 Currency System</SectionTitle>
        
        <div className="space-y-4">
          <div>
            <SubsectionTitle>Amount Component Variants</SubsectionTitle>
            <Caption className="mt-1 mb-4">
              Use the Amount component for ALL monetary displays
            </Caption>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <Caption className="mb-2">Neutral (default)</Caption>
                <Amount value={25000} variant="neutral" size="lg" bold />
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <Caption className="mb-2">Positive (green)</Caption>
                <Amount value={50000} variant="positive" size="lg" bold />
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <Caption className="mb-2">Negative (red)</Caption>
                <Amount value={-5000} variant="negative" size="lg" bold />
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <Caption className="mb-2">Highlight (blue)</Caption>
                <Amount value={100000} variant="highlight" size="lg" bold />
              </div>
            </div>
          </div>

          <div>
            <SubsectionTitle>Amount Sizes</SubsectionTitle>
            <Caption className="mt-1 mb-4">Different size options</Caption>
            
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Caption className="w-24">Extra Small:</Caption>
                <Amount value={25000} size="xs" />
              </div>
              <div className="flex items-center gap-4">
                <Caption className="w-24">Small:</Caption>
                <Amount value={25000} size="sm" />
              </div>
              <div className="flex items-center gap-4">
                <Caption className="w-24">Medium:</Caption>
                <Amount value={25000} size="md" />
              </div>
              <div className="flex items-center gap-4">
                <Caption className="w-24">Large:</Caption>
                <Amount value={25000} size="lg" />
              </div>
              <div className="flex items-center gap-4">
                <Caption className="w-24">Extra Large:</Caption>
                <Amount value={25000} size="xl" />
              </div>
              <div className="flex items-center gap-4">
                <Caption className="w-24">2X Large:</Caption>
                <Amount value={25000} size="2xl" />
              </div>
            </div>
          </div>

          <div>
            <SubsectionTitle>Amount Cards</SubsectionTitle>
            <Caption className="mt-1 mb-4">For dashboard summaries</Caption>
            
            <div className="grid grid-cols-4 gap-4">
              <AmountCard
                label="Total Revenue"
                amount={500000}
                variant="positive"
                icon={<Icon icon={DollarSign} size="md" />}
              />
              
              <AmountCard
                label="Pending Payments"
                amount={125000}
                variant="highlight"
                icon={<Icon icon={Clock} size="md" />}
              />
              
              <AmountCard
                label="Total Bookings"
                amount={45}
                variant="neutral"
                icon={<Icon icon={Calendar} size="md" />}
              />
              
              <AmountCard
                label="Confirmed"
                amount={38}
                variant="positive"
                icon={<Icon icon={CheckCircle} size="md" />}
              />
            </div>
          </div>

          <div>
            <SubsectionTitle>Currency Input</SubsectionTitle>
            <Caption className="mt-1 mb-4">Use for monetary input fields</Caption>
            
            <div className="max-w-xs">
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="Enter amount"
              />
              <Caption className="mt-2">
                Current value: <Amount value={amount} size="sm" />
              </Caption>
            </div>
          </div>
        </div>
      </section>

      {/* Icon System */}
      <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-6">
        <SectionTitle>🎨 Icon System</SectionTitle>
        
        <div className="space-y-4">
          <div>
            <SubsectionTitle>Icon Sizes</SubsectionTitle>
            <Caption className="mt-1 mb-4">
              sm (16px) for UI, md (20px) for headers
            </Caption>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Icon icon={Calendar} size="xs" className="text-gray-600" />
                <Caption>XS (14px)</Caption>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon={Calendar} size="sm" className="text-gray-600" />
                <Caption>SM (16px)</Caption>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon={Calendar} size="md" className="text-blue-600" />
                <Caption>MD (20px)</Caption>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon={Calendar} size="lg" className="text-gray-600" />
                <Caption>LG (24px)</Caption>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon={Calendar} size="xl" className="text-gray-600" />
                <Caption>XL (28px)</Caption>
              </div>
            </div>
          </div>

          <div>
            <SubsectionTitle>Icon Badges</SubsectionTitle>
            <Caption className="mt-1 mb-4">Icons with subtle backgrounds</Caption>
            
            <div className="flex items-center gap-4">
              <IconBadge icon={Calendar} variant="neutral" />
              <IconBadge icon={CheckCircle} variant="success" />
              <IconBadge icon={AlertCircle} variant="warning" />
              <IconBadge icon={XCircle} variant="danger" />
              <IconBadge icon={Info} variant="info" />
              <IconBadge icon={Users} variant="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Status Colors */}
      <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-6">
        <SectionTitle>🎨 Status Color System</SectionTitle>
        
        <div className="space-y-4">
          <div>
            <SubsectionTitle>Status Badges</SubsectionTitle>
            <Caption className="mt-1 mb-4">
              Fixed color meanings: Green=Confirmed, Yellow=Partial, Red=Error, Blue=Info, Gray=Disabled
            </Caption>
            
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="confirmed" label="Confirmed" />
              <StatusBadge status="tentative" label="Tentative" />
              <StatusBadge status="cancelled" label="Cancelled" />
              <StatusBadge status="pending" label="Pending" />
              <StatusBadge status="archived" label="Archived" />
              
              <StatusBadge status="paid" label="Paid" />
              <StatusBadge status="partial" label="Partial Payment" />
              <StatusBadge status="overdue" label="Overdue" />
              
              <StatusBadge status="available" label="Available" />
              <StatusBadge status="blocked" label="Blocked" />
            </div>
          </div>

          <div>
            <SubsectionTitle>Status Dots</SubsectionTitle>
            <Caption className="mt-1 mb-4">Compact status indicators</Caption>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <StatusDot status="green" size="md" />
                <Caption>Success</Caption>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="yellow" size="md" />
                <Caption>Warning</Caption>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="red" size="md" />
                <Caption>Error</Caption>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="blue" size="md" />
                <Caption>Info</Caption>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status="gray" size="md" />
                <Caption>Disabled</Caption>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-6">
        <SectionTitle>📝 Typography System</SectionTitle>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <PageTitle>Page Title (H1)</PageTitle>
            <Caption>2xl, semibold - Use once per page</Caption>
          </div>

          <div className="border-l-4 border-blue-400 pl-4">
            <SectionTitle>Section Title (H2)</SectionTitle>
            <Caption>xl, semibold - Major sections</Caption>
          </div>

          <div className="border-l-4 border-blue-300 pl-4">
            <SubsectionTitle>Subsection Title (H3)</SubsectionTitle>
            <Caption>lg, semibold - Subsections and cards</Caption>
          </div>

          <div className="border-l-4 border-blue-200 pl-4">
            <CardTitle>Card Title (H4)</CardTitle>
            <Caption>base, semibold - Dialog titles</Caption>
          </div>

          <div className="border-l-4 border-gray-300 pl-4">
            <FieldLabel required>Field Label</FieldLabel>
            <Caption>sm, medium - Form labels</Caption>
          </div>

          <div className="border-l-4 border-gray-200 pl-4">
            <BodyText>
              Body Text - This is the standard paragraph text used throughout the ERP.
              It's designed for readability and comfortable reading during long work sessions.
            </BodyText>
            <Caption className="mt-1">sm, normal - Paragraph text</Caption>
          </div>

          <div className="border-l-4 border-gray-100 pl-4">
            <Caption>
              Caption text - Helper text, metadata, timestamps
            </Caption>
            <Caption className="mt-1 text-gray-400">xs, normal - Small descriptive text</Caption>
          </div>
        </div>
      </section>

      {/* Time System */}
      <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-6">
        <SectionTitle>⏰ Time System</SectionTitle>
        
        <div className="space-y-4">
          <div>
            <SubsectionTitle>Time Picker</SubsectionTitle>
            <Caption className="mt-1 mb-4">
              12-hour format with 30-minute intervals
            </Caption>
            
            <div className="max-w-xs">
              <TimePicker
                value={time}
                onChange={setTime}
                placeholder="Select time"
              />
              <Caption className="mt-2">
                Selected: {formatTimeDisplay(time)}
              </Caption>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section className="bg-blue-50 rounded-lg p-8 border border-blue-200 space-y-4">
        <SectionTitle>📋 Design System Rules</SectionTitle>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <CardTitle className="text-green-700 mb-3">✅ DO</CardTitle>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Use Amount component for all monetary values</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Use Icon component with size prop</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Use StatusBadge for all status displays</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Follow typography hierarchy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Use TimePicker for all time inputs</span>
              </li>
            </ul>
          </div>

          <div>
            <CardTitle className="text-red-700 mb-3">❌ DON'T</CardTitle>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Hardcode currency symbols (Rs., $)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Use emojis instead of icons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Use custom status colors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Use arbitrary text sizes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Allow free-text time entry</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
