import { Building2, Phone, Mail, Clock, Globe2, MapPin, Save } from 'lucide-react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import {
  CompactFormSection,
  CompactHoursRow,
  InlineSummarySection,
} from './SetupCompactPrimitives';

export function OrganizationSetup() {
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 xl:grid-cols-[1.15fr_0.85fr]">
        <CompactFormSection title="Organization Profile" icon={Building2} iconClassName="text-blue-600">
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <Label>Company Name</Label>
              <Input defaultValue="VenueOps Hospitality Services" />
            </div>
            <div>
              <Label>Trade Name</Label>
              <Input defaultValue="VenueOps Banquet" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input placeholder="Business registration #" />
            </div>
            <div>
              <Label>Tax Number (NTN)</Label>
              <Input placeholder="National Tax Number" />
            </div>
            <div>
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" defaultValue="+92 42 1234567" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" type="email" defaultValue="info@venueops.com" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <Label>Website</Label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" defaultValue="www.venueops.com" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <Label>Company Address</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                <Textarea className="min-h-[88px] pl-9" rows={3} defaultValue="123 Main Boulevard, Gulberg III, Lahore, Pakistan" />
              </div>
            </div>
          </div>
        </CompactFormSection>

        <CompactFormSection title="Business Hours" icon={Clock} iconClassName="text-blue-600">
          <div className="space-y-2">
            {[
              'Monday - Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ].map((day) => (
              <CompactHoursRow
                key={day}
              >
                <div className="text-sm font-medium text-slate-700">{day}</div>
                <Input type="time" defaultValue="09:00" />
                <Input type="time" defaultValue="22:00" />
              </CompactHoursRow>
            ))}

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              Use business hours that match reservation and operations teams.
            </div>
          </div>
        </CompactFormSection>
      </div>

      <InlineSummarySection title="Save Organization Settings" icon={Save} iconClassName="text-blue-600">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            This profile is used across reservation records, reports, and document headers.
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 size-4" />
            Save Organization Settings
          </Button>
        </div>
      </InlineSummarySection>
    </div>
  );
}
