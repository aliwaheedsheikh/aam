import { useEffect, useState } from 'react';
import { Banknote, Calendar, Edit2, Save, Shield, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { CompactFormSection, SetupAdminColumn, SetupAdminGrid } from './SetupCompactPrimitives';
import {
  defaultSetupAdvancePolicy,
  loadSetupAdvancePolicy,
  saveSetupAdvancePolicy,
  type SetupAdvancePolicy,
} from './setupMasterData';

interface AdvanceRulesSetupProps {
  userName: string;
  compact?: boolean;
}

function formatDate(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return 'Not recorded';
  return value.toLocaleDateString('en-PK');
}

export function AdvanceRulesSetup({ userName, compact = false }: AdvanceRulesSetupProps) {
  const [policy, setPolicy] = useState<SetupAdvancePolicy>(loadSetupAdvancePolicy() || defaultSetupAdvancePolicy);
  const [editedPolicy, setEditedPolicy] = useState<SetupAdvancePolicy | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const activePolicy = editedPolicy || policy;

  useEffect(() => {
    const reloadPolicy = () => {
      if (isEditing) {
        return;
      }

      setPolicy(loadSetupAdvancePolicy() || defaultSetupAdvancePolicy);
    };

    const handleMasterDataUpdated = (event: Event) => {
      const key = String((event as CustomEvent<{ key?: string }>).detail?.key || '');
      if (!key || key === 'all' || key === 'venueops_master_advance_rules') {
        reloadPolicy();
      }
    };

    const handleStorageUpdated = (event: StorageEvent) => {
      if (!event.key || event.key === 'venueops_master_advance_rules') {
        reloadPolicy();
      }
    };

    window.addEventListener('masterDataUpdated', handleMasterDataUpdated);
    window.addEventListener('storage', handleStorageUpdated);

    return () => {
      window.removeEventListener('masterDataUpdated', handleMasterDataUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, [isEditing]);

  const handleEdit = () => {
    setEditedPolicy({ ...policy });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedPolicy(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!editedPolicy) return;

    if (editedPolicy.primeSpaceMinimumAdvance < 0 || editedPolicy.subSpaceMinimumAdvance < 0) {
      alert('Minimum advance values cannot be negative');
      return;
    }

    if (editedPolicy.dueDaysAfterBooking < 0) {
      alert('Due days after booking cannot be negative');
      return;
    }

    const nextPolicy: SetupAdvancePolicy = {
      ...editedPolicy,
      updatedAt: new Date(),
      updatedBy: userName,
    };

    setPolicy(nextPolicy);
    saveSetupAdvancePolicy(nextPolicy);
    setEditedPolicy(null);
    setIsEditing(false);
  };

  return (
    <SetupAdminGrid className={compact ? 'xl:grid-cols-[minmax(0,1fr)_240px] gap-2.5' : 'xl:grid-cols-[minmax(0,1fr)_280px]'}>
      <SetupAdminColumn>
        <div className="space-y-2.5">
          <div className={`sticky top-0 z-10 rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`truncate font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>Advance Rules</h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                      <Save className="mr-1 size-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                      <X className="mr-1 size-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleEdit} className="h-8">
                    <Edit2 className="mr-1 size-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>

          <CompactFormSection title="Policy" icon={Banknote} iconClassName="text-emerald-600">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Minimum Advance for Prime Space</Label>
                <Input
                  type="number"
                  value={activePolicy.primeSpaceMinimumAdvance}
                  onChange={(e) =>
                    setEditedPolicy({
                      ...activePolicy,
                      primeSpaceMinimumAdvance: Number(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Minimum Advance for Sub Space</Label>
                <Input
                  type="number"
                  value={activePolicy.subSpaceMinimumAdvance}
                  onChange={(e) =>
                    setEditedPolicy({
                      ...activePolicy,
                      subSpaceMinimumAdvance: Number(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Due Days After Booking</Label>
                <Input
                  type="number"
                  value={activePolicy.dueDaysAfterBooking}
                  onChange={(e) =>
                    setEditedPolicy({
                      ...activePolicy,
                      dueDaysAfterBooking: Number(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                />
              </div>
            </div>
          </CompactFormSection>
        </div>
      </SetupAdminColumn>

      <SetupAdminColumn>
        <CompactFormSection title="Record Information" icon={Shield} iconClassName="text-slate-500">
          <div className="grid gap-1.5 text-[11px] text-slate-600">
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <div className="font-medium text-slate-500">Created</div>
              <div className="mt-0.5">{formatDate(activePolicy.createdAt)} by {activePolicy.createdBy || 'System'}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <div className="font-medium text-slate-500">Last Updated</div>
              <div>
                {activePolicy.updatedAt
                  ? `${formatDate(activePolicy.updatedAt)} by ${activePolicy.updatedBy || 'System'}`
                  : 'No updates recorded'}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <div className="font-medium text-slate-500">Usage</div>
              <div>Reservations and inquiry follow-ups read this policy for minimum advance commitments.</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
              <div className="font-medium text-slate-500">Balance Deadline</div>
              <div>Managed in Venue &amp; Space per venue.</div>
            </div>
          </div>
        </CompactFormSection>

        <CompactFormSection title="Reminder" icon={Calendar} iconClassName="text-slate-500">
          <div className="text-sm text-slate-600">
            Minimum advance remains inventory-focused here. Final balance follow-up stays with the selected venue so operations can manage venue-specific deadlines.
          </div>
        </CompactFormSection>
      </SetupAdminColumn>
    </SetupAdminGrid>
  );
}
