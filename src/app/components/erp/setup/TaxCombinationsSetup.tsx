import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  Layers,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { CompactFormSection, SetupAdminColumn, SetupAdminGrid } from './SetupCompactPrimitives';

interface TaxDefinitionRef {
  id: string;
  name: string;
  percentage: number;
  isActive: boolean;
}

interface TaxCombination {
  id: string;
  name: string;
  taxIds: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

interface TaxCombinationsSetupProps {
  userName: string;
}

const taxDefinitions: TaxDefinitionRef[] = [
  { id: '1', name: 'PRA', percentage: 16, isActive: true },
  { id: '2', name: 'Withholding', percentage: 10, isActive: true },
  { id: '3', name: 'Service Tax', percentage: 5, isActive: false },
];

const initialCombinations: TaxCombination[] = [
  {
    id: '1',
    name: 'Standard Govt Combo',
    taxIds: ['1', '2'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'Admin',
  },
  {
    id: '2',
    name: 'Service Combo',
    taxIds: ['1', '3'],
    isActive: true,
    createdAt: new Date('2024-01-10'),
    createdBy: 'Admin',
  },
];

function formatDate(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return 'Not recorded';
  return value.toLocaleDateString('en-PK');
}

export function TaxCombinationsSetup({ userName }: TaxCombinationsSetupProps) {
  const [combinations, setCombinations] = useState<TaxCombination[]>(initialCombinations);
  const [selectedCombination, setSelectedCombination] = useState<TaxCombination | null>(initialCombinations[0] ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedCombination, setEditedCombination] = useState<TaxCombination | null>(null);

  const filteredCombinations = useMemo(
    () =>
      combinations.filter((combination) =>
        combination.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [combinations, searchQuery],
  );

  const activeCombination = editedCombination || selectedCombination;

  const getTaxName = (taxId: string) => taxDefinitions.find((tax) => tax.id === taxId)?.name || taxId;

  const getSelectedTaxSummary = (taxIds: string[]) => {
    if (taxIds.length === 0) return 'No taxes selected';
    if (taxIds.length <= 2) return taxIds.map(getTaxName).join(', ');
    return `${taxIds.length} taxes selected`;
  };

  const toggleTaxSelection = (taxId: string) => {
    if (!activeCombination) return;
    const currentTaxIds = activeCombination.taxIds || [];
    const nextTaxIds = currentTaxIds.includes(taxId)
      ? currentTaxIds.filter((id) => id !== taxId)
      : [...currentTaxIds, taxId];
    setEditedCombination({ ...activeCombination, taxIds: nextTaxIds });
  };

  const handleCreateNew = () => {
    const newCombination: TaxCombination = {
      id: `temp-${Date.now()}`,
      name: '',
      taxIds: [],
      isActive: true,
      createdAt: new Date(),
      createdBy: userName,
    };
    setEditedCombination(newCombination);
    setSelectedCombination(newCombination);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!selectedCombination) return;
    setEditedCombination({ ...selectedCombination });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedCombination) return;
    if (!editedCombination.name.trim()) {
      alert('Combination Name is required');
      return;
    }
    if (editedCombination.taxIds.length === 0) {
      alert('Select at least one tax definition');
      return;
    }

    if (isCreating) {
      const newCombination = {
        ...editedCombination,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: userName,
      };
      setCombinations([...combinations, newCombination]);
      setSelectedCombination(newCombination);
      setIsCreating(false);
    } else {
      const updatedCombination = {
        ...editedCombination,
        updatedAt: new Date(),
        updatedBy: userName,
      };
      setCombinations(
        combinations.map((combination) =>
          combination.id === updatedCombination.id ? updatedCombination : combination,
        ),
      );
      setSelectedCombination(updatedCombination);
    }

    setEditedCombination(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCombination(null);
    setIsEditing(false);
    if (isCreating) {
      setSelectedCombination(combinations[0] ?? null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedCombination || !window.confirm(`Are you sure you want to delete "${selectedCombination.name}"?`)) return;
    const remainingCombinations = combinations.filter((combination) => combination.id !== selectedCombination.id);
    setCombinations(remainingCombinations);
    setSelectedCombination(remainingCombinations[0] ?? null);
    setEditedCombination(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleStatus = () => {
    if (!selectedCombination) return;
    const updatedCombination = { ...selectedCombination, isActive: !selectedCombination.isActive };
    setCombinations(
      combinations.map((combination) =>
        combination.id === updatedCombination.id ? updatedCombination : combination,
      ),
    );
    setSelectedCombination(updatedCombination);
    if (editedCombination?.id === updatedCombination.id) {
      setEditedCombination(updatedCombination);
    }
  };

  if (!activeCombination) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
        No tax combinations available. Create a combination to begin.
      </div>
    );
  }

  return (
    <SetupAdminGrid className="xl:grid-cols-[280px_minmax(0,1fr)]">
      <SetupAdminColumn>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-3 py-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Layers className="size-4 text-indigo-600" />
                  Tax Combinations
                </h3>
                <p className="text-xs text-slate-500">{combinations.length} configured</p>
              </div>
              <Button onClick={handleCreateNew} disabled={isEditing} size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-1 size-4" />
                New
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search combinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="max-h-[640px] overflow-y-auto p-2">
            {filteredCombinations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                <Layers className="mx-auto mb-2 size-10 text-slate-300" />
                No matching combinations found.
              </div>
            ) : (
              filteredCombinations.map((combination) => (
                <button
                  key={combination.id}
                  type="button"
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedCombination(combination);
                    }
                  }}
                  disabled={isEditing}
                  className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedCombination?.id === combination.id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                  } ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{combination.name || 'Untitled Combination'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {getSelectedTaxSummary(combination.taxIds)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${combination.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {combination.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </SetupAdminColumn>

      <SetupAdminColumn>
        <div className="space-y-2.5">
          <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-slate-900">
                    {activeCombination.name || 'New Tax Combination'}
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${activeCombination.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {activeCombination.isActive ? 'Active' : 'Inactive'}
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
                  <>
                    <Button size="sm" variant="outline" onClick={handleEdit} className="h-8" disabled={!selectedCombination}>
                      <Edit2 className="mr-1 size-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleToggleStatus} className="h-8" disabled={!selectedCombination}>
                      <CheckCircle2 className="mr-1 size-4" />
                      {selectedCombination?.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={!selectedCombination}
                    >
                      <Trash2 className="mr-1 size-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <CompactFormSection title="Combination Editor" icon={Layers} iconClassName="text-indigo-600">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={activeCombination.name}
                  onChange={(e) => setEditedCombination({ ...activeCombination, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g. Standard Govt Combo"
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Tax Definitions <span className="text-red-500">*</span>
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={!isEditing}>
                    <button
                      type="button"
                      className={`flex h-9 w-full items-center justify-between rounded-md border border-slate-300 px-3 text-left text-sm ${
                        !isEditing ? 'cursor-not-allowed bg-slate-50 text-slate-600' : 'bg-white'
                      }`}
                    >
                      <span className="truncate text-slate-700">{getSelectedTaxSummary(activeCombination.taxIds)}</span>
                      <Layers className="size-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>Select Tax Definitions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {taxDefinitions.map((tax) => (
                      <DropdownMenuCheckboxItem
                        key={tax.id}
                        checked={activeCombination.taxIds.includes(tax.id)}
                        onCheckedChange={() => toggleTaxSelection(tax.id)}
                      >
                        {tax.name} ({tax.percentage}%)
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CompactFormSection>

          <CompactFormSection title="Record Information" icon={Shield} iconClassName="text-slate-500">
            <div className="grid gap-1.5 md:grid-cols-2 text-[10px] text-slate-600">
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-2 py-1.5">
                <div className="font-medium text-slate-500">Created</div>
                <div className="mt-0.5">{formatDate(activeCombination.createdAt)} by {activeCombination.createdBy || 'System'}</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50/70 px-2 py-1.5">
                <div className="font-medium text-slate-500">Last Updated</div>
                <div>
                  {activeCombination.updatedAt
                    ? `${formatDate(activeCombination.updatedAt)} by ${activeCombination.updatedBy || 'System'}`
                    : 'No updates recorded'}
                </div>
              </div>
            </div>
          </CompactFormSection>
        </div>
      </SetupAdminColumn>
    </SetupAdminGrid>
  );
}
