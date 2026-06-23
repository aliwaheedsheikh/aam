import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Power, Save, Search, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  defaultSetupEventTypes,
  loadSetupEventTypes,
  saveSetupEventTypes,
  slugifyEventTypeName,
  type SetupEventCategory,
  type SetupEventType,
} from './setupMasterData';

interface EventTypeSetupProps {
  userName: string;
  compact?: boolean;
}

type EventTypeFilter = 'all' | SetupEventCategory;

const categories: Array<{ id: SetupEventCategory; name: string }> = [
  { id: 'wedding', name: 'Wedding' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'social', name: 'Social' },
  { id: 'religious', name: 'Religious' },
  { id: 'other', name: 'Other' },
];

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const emptyEventType = (userName: string): SetupEventType => ({
  id: `temp-${Date.now()}`,
  name: '',
  displayName: '',
  category: 'social',
  isActive: true,
  createdAt: new Date(),
  createdBy: userName,
  notes: '',
});

const formatDate = (value?: Date) => {
  if (!value || Number.isNaN(value.getTime())) return '-';
  return value.toLocaleDateString('en-PK');
};

const getCategoryName = (categoryId: SetupEventCategory) =>
  categories.find((category) => category.id === categoryId)?.name || 'Other';

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
  }`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

export function EventTypeSetup({ userName }: EventTypeSetupProps) {
  const loadedEventTypes = loadSetupEventTypes();
  const [eventTypes, setEventTypes] = useState<SetupEventType[]>(
    loadedEventTypes.length > 0 ? loadedEventTypes : defaultSetupEventTypes,
  );
  const [selectedEventType, setSelectedEventType] = useState<SetupEventType | null>(
    (loadedEventTypes.length > 0 ? loadedEventTypes : defaultSetupEventTypes)[0] ?? null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventTypeFilter>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedEventType, setEditedEventType] = useState<SetupEventType | null>(null);

  const filteredEventTypes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return eventTypes.filter((eventType) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [eventType.displayName, eventType.name, eventType.notes]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      const matchesCategory = categoryFilter === 'all' || eventType.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, eventTypes, searchQuery]);

  const metrics = useMemo(
    () => ({
      total: eventTypes.length,
      active: eventTypes.filter((eventType) => eventType.isActive).length,
      inactive: eventTypes.filter((eventType) => !eventType.isActive).length,
      filtered: filteredEventTypes.length,
    }),
    [eventTypes, filteredEventTypes.length],
  );

  useEffect(() => {
    if (isEditing) return;
    if (!selectedEventType || !filteredEventTypes.some((item) => item.id === selectedEventType.id)) {
      setSelectedEventType(filteredEventTypes[0] ?? null);
    }
  }, [filteredEventTypes, isEditing, selectedEventType]);

  const persistEventTypes = (nextEventTypes: SetupEventType[]) => {
    setEventTypes(nextEventTypes);
    saveSetupEventTypes(nextEventTypes);
  };

  const activeEventType = editedEventType || selectedEventType;
  const inputStateClass = `h-9 rounded border-slate-300 ${!isEditing ? 'bg-slate-50 text-slate-700' : 'bg-white'}`;
  const selectStateClass = `h-9 w-full rounded border border-slate-300 px-3 text-sm ${
    !isEditing ? 'bg-slate-50 text-slate-600' : 'bg-white text-slate-700'
  }`;

  const handleCreateNew = () => {
    const newEventType = emptyEventType(userName);
    setEditedEventType(newEventType);
    setSelectedEventType(newEventType);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (!selectedEventType) return;
    setEditedEventType({ ...selectedEventType });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedEventType) return;

    const displayName = editedEventType.displayName.trim();
    if (!displayName) {
      alert('Event Type Name is required');
      return;
    }

    const normalizedDisplayName = displayName.toLowerCase();
    const hasDuplicateName = eventTypes.some(
      (eventType) =>
        eventType.id !== editedEventType.id &&
        (eventType.displayName || '').trim().toLowerCase() === normalizedDisplayName,
    );

    if (hasDuplicateName) {
      alert('An Event Type with this name already exists.');
      return;
    }

    if (isCreating) {
      const newEventType: SetupEventType = {
        ...editedEventType,
        id: Date.now().toString(),
        name: slugifyEventTypeName(displayName),
        displayName,
        createdAt: new Date(),
        createdBy: userName,
      };
      persistEventTypes([...eventTypes, newEventType]);
      setSelectedEventType(newEventType);
      setIsCreating(false);
    } else {
      const updatedEventType: SetupEventType = {
        ...editedEventType,
        name: slugifyEventTypeName(displayName),
        displayName,
        updatedAt: new Date(),
        updatedBy: userName,
      };
      persistEventTypes(
        eventTypes.map((eventType) => (eventType.id === updatedEventType.id ? updatedEventType : eventType)),
      );
      setSelectedEventType(updatedEventType);
    }

    setEditedEventType(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEventType(null);
    setIsEditing(false);
    if (isCreating) {
      setSelectedEventType(eventTypes[0] ?? null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedEventType || !window.confirm(`Delete "${selectedEventType.displayName}"?`)) return;

    const remaining = eventTypes.filter((item) => item.id !== selectedEventType.id);
    persistEventTypes(remaining);
    setSelectedEventType(remaining[0] ?? null);
    setEditedEventType(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleStatus = () => {
    if (!selectedEventType) return;
    const updated = { ...selectedEventType, isActive: !selectedEventType.isActive };
    persistEventTypes(eventTypes.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedEventType(updated);
    if (editedEventType?.id === updated.id) {
      setEditedEventType(updated);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <h2 className="mr-2 text-sm font-semibold text-slate-900">Event Types</h2>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as EventTypeFilter)}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search event type, category, or note"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 rounded border-slate-300 pl-9"
            />
          </div>
          <Button onClick={handleCreateNew} disabled={isEditing} className="h-9 bg-blue-600 px-3 hover:bg-blue-700">
            <Plus className="mr-1.5 size-4" />
            New
          </Button>
        </div>

        <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span><strong className="text-slate-900">Records:</strong> {metrics.total}</span>
            <span><strong className="text-slate-900">Showing:</strong> {metrics.filtered}</span>
            <span><strong className="text-slate-900">Active:</strong> {metrics.active}</span>
            <span><strong className="text-slate-900">Inactive:</strong> {metrics.inactive}</span>
            <span><strong className="text-slate-900">User:</strong> {userName}</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-0 overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Event Type Register</h3>
            <span className="text-xs text-slate-500">{filteredEventTypes.length} rows</span>
          </div>

          <div className="h-full overflow-auto pb-10">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className={tableHeadClass}>Event Type</th>
                  <th className={tableHeadClass}>Category</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventTypes.map((eventType) => {
                  const isSelected = selectedEventType?.id === eventType.id;

                  return (
                    <tr
                      key={eventType.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedEventType(eventType);
                        }
                      }}
                      className={`cursor-pointer border-t border-slate-200 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } ${isEditing ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <td className={tableCellClass}>
                        <div className="font-medium text-slate-900">{eventType.displayName || 'Untitled Event Type'}</div>
                        <div className="text-xs text-slate-500">{eventType.name || 'No code'}</div>
                      </td>
                      <td className={tableCellClass}>{getCategoryName(eventType.category)}</td>
                      <td className={tableCellClass}><StatusBadge isActive={eventType.isActive} /></td>
                      <td className={tableCellClass}>{formatDate(eventType.createdAt)}</td>
                    </tr>
                  );
                })}
                {filteredEventTypes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={4}>
                      No event types found for the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-h-0 overflow-auto rounded border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {isCreating ? 'Create Event Type' : activeEventType?.displayName || 'Select Event Type'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeEventType ? `${getCategoryName(activeEventType.category)} - ${activeEventType.isActive ? 'Active' : 'Inactive'}` : 'No record selected'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                    <Save className="mr-1 size-4" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit} className="h-8" disabled={!selectedEventType}>
                    <Edit2 className="mr-1 size-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleToggleStatus} className="h-8" disabled={!selectedEventType}>
                    <Power className="mr-1 size-4" />
                    {selectedEventType?.isActive ? 'Off' : 'On'}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleDelete}
                    className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!selectedEventType}
                    aria-label="Delete event type"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {activeEventType ? (
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">
                    Event Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={activeEventType.displayName}
                    onChange={(event) => setEditedEventType({ ...activeEventType, displayName: event.target.value })}
                    disabled={!isEditing}
                    className={inputStateClass}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-slate-700">Category</Label>
                  <select
                    value={activeEventType.category}
                    onChange={(event) => setEditedEventType({ ...activeEventType, category: event.target.value as SetupEventCategory })}
                    disabled={!isEditing}
                    className={selectStateClass}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-700">Notes</Label>
                <Textarea
                  rows={5}
                  value={activeEventType.notes || ''}
                  onChange={(event) => setEditedEventType({ ...activeEventType, notes: event.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : 'bg-white'}
                  placeholder="Short note for reservation teams."
                />
              </div>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Select an event type or create a new record.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
