import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Shield, UserPlus, Users } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { usersApi, type ManagedUser, type UserPermissionInput } from '@/app/lib/usersApi';
import { toast } from 'sonner';
import { AuthUser } from '@/app/lib/authTypes';

type UsersRolesSetupProps = {
  userName: string;
};

type SupportedRole = AuthUser['role'];

const roleOptions: Array<{ value: SupportedRole; label: string; summary: string }> = [
  { value: 'ADMIN', label: 'Admin', summary: 'Full ERP Access' },
  { value: 'GENERAL_MANAGER', label: 'General Manager', summary: 'Operations Control' },
  { value: 'FRONT_OFFICE', label: 'Front Office', summary: 'Reservations' },
  { value: 'ACCOUNTS', label: 'Accounts', summary: 'Finance' },
  { value: 'BANQUET_CHEF', label: 'Banquet Chef', summary: 'Banquet Kitchen' },
  { value: 'RESTAURANT_CHEF', label: 'Restaurant Chef', summary: 'Restaurant Kitchen' },
  { value: 'HR_MANAGER', label: 'HR Manager', summary: 'Human Resources' },
];

const roleAccessSummary: Record<
  SupportedRole,
  { title: string; description: string; modules: string[] }
> = {
  ADMIN: {
    title: 'Full ERP Access',
    description: 'Admin keeps complete access to ERP operations, setup, and user administration.',
    modules: [
      'All dashboards and modules',
      'Reservation workspace and reports',
      'Setup map, system defaults, and configuration',
      'Users & Roles',
      'Kitchen, accounts, inventory, and procurement',
    ],
  },
  FRONT_OFFICE: {
    title: 'Reservation Workspace Only',
    description: 'Front Office is limited to the reservation workflow and customer-facing booking operations.',
    modules: [
      'Reservation Dashboard',
      'Confirmed Reservations',
      'Inquiry Follow-ups',
      'Tentative Pipeline',
      'Pending Confirmations',
      'Payment Follow-ups and Payment Ledger when enabled',
      'Customer search/history and Booking Agreement preview/print',
    ],
  },
  GENERAL_MANAGER: {
    title: 'Operations Control',
    description: 'General Manager can supervise operations, reservations, reports, customer records, and financial follow-up.',
    modules: ['Dashboard', 'Reservations', 'Customer Database', 'Accounts visibility', 'Reports', 'Operational approvals'],
  },
  ACCOUNTS: {
    title: 'Finance Workspace',
    description: 'Accounts users focus on payment collection, ledgers, invoices, and financial reporting.',
    modules: ['Dashboard', 'Accounts & Finance', 'Payment follow-ups', 'Reports', 'Customer balances'],
  },
  BANQUET_CHEF: {
    title: 'Banquet Kitchen Workspace',
    description: 'Banquet Chef users manage banquet production, menus, and kitchen planning.',
    modules: ['Dashboard', 'Banquet Kitchen', 'Reservation production visibility', 'Inventory visibility'],
  },
  RESTAURANT_CHEF: {
    title: 'Restaurant Kitchen Workspace',
    description: 'Restaurant Chef users manage daily production, menus, recipes, and kitchen stock visibility.',
    modules: ['Dashboard', 'Restaurant Kitchen', 'Menu categories', 'Recipes', 'Inventory visibility'],
  },
  HR_MANAGER: {
    title: 'Human Resources Workspace',
    description: 'HR Manager users work with employee administration and HR records.',
    modules: ['Dashboard', 'Human Resources'],
  },
};

const blankPermission = (moduleKey: string): UserPermissionInput => ({
  moduleKey,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  canManage: false,
});

const fullPermission = (moduleKey: string): UserPermissionInput => ({
  moduleKey,
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canExport: true,
  canManage: true,
});

const normalizeSupportedRole = (role: string): SupportedRole =>
  roleOptions.some((option) => option.value === role) ? (role as SupportedRole) : 'FRONT_OFFICE';

const buildPermissionsForRole = (
  role: SupportedRole,
  catalog: Array<{ key: string; label: string }>,
): UserPermissionInput[] =>
  catalog.map((item) => {
    if (role === 'ADMIN') {
      return fullPermission(item.key);
    }

    if (item.key === 'dashboard') {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        canManage: false,
      };
    }

    if (role === 'GENERAL_MANAGER') {
      if (['reservations', 'customer-database', 'reports', 'accounts-finance'].includes(item.key)) {
        return {
          moduleKey: item.key,
          canView: true,
          canCreate: item.key !== 'reports',
          canEdit: item.key !== 'reports',
          canDelete: false,
          canApprove: true,
          canExport: true,
          canManage: item.key === 'reservations',
        };
      }

      return blankPermission(item.key);
    }

    if (role === 'FRONT_OFFICE' && item.key === 'reservations') {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canExport: true,
        canManage: true,
      };
    }

    if (role === 'FRONT_OFFICE' && item.key === 'customer-database') {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: false,
        canExport: false,
        canManage: false,
      };
    }

    if (role === 'ACCOUNTS' && ['accounts-finance', 'reports'].includes(item.key)) {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: item.key === 'accounts-finance',
        canEdit: item.key === 'accounts-finance',
        canDelete: false,
        canApprove: true,
        canExport: true,
        canManage: item.key === 'accounts-finance',
      };
    }

    if (role === 'BANQUET_CHEF' && ['banquet-kitchen', 'inventory', 'reservations'].includes(item.key)) {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: item.key === 'banquet-kitchen',
        canEdit: item.key === 'banquet-kitchen',
        canDelete: false,
        canApprove: false,
        canExport: false,
        canManage: item.key === 'banquet-kitchen',
      };
    }

    if (role === 'RESTAURANT_CHEF' && ['restaurant-kitchen', 'inventory'].includes(item.key)) {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: item.key === 'restaurant-kitchen',
        canEdit: item.key === 'restaurant-kitchen',
        canDelete: false,
        canApprove: false,
        canExport: false,
        canManage: item.key === 'restaurant-kitchen',
      };
    }

    if (role === 'HR_MANAGER' && item.key === 'hr') {
      return {
        moduleKey: item.key,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canExport: true,
        canManage: true,
      };
    }

    return blankPermission(item.key);
  });

const getRoleLabel = (role: string) => roleOptions.find((option) => option.value === normalizeSupportedRole(role))?.label || role;

export function UsersRolesSetup({ userName }: UsersRolesSetupProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [catalog, setCatalog] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedOverrides, setShowAdvancedOverrides] = useState(false);
  const [draft, setDraft] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'FRONT_OFFICE' as SupportedRole,
    isActive: true,
    permissions: [] as UserPermissionInput[],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedUsers, loadedCatalog] = await Promise.all([
          usersApi.fetchUsers(),
          usersApi.fetchPermissionCatalog(),
        ]);
        setUsers(loadedUsers);
        setCatalog(loadedCatalog);
        if (loadedUsers[0]) {
          setSelectedUserId(loadedUsers[0].id);
        }
      } catch (error) {
        toast.error('Failed to load user access setup', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    load();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const activeRole = normalizeSupportedRole(draft.role);
  const roleSummary = roleAccessSummary[activeRole];
  const filteredPermissions = draft.permissions.filter((permission) =>
    catalog.some((item) => item.key === permission.moduleKey),
  );

  const startCreate = () => {
    setIsCreating(true);
    setSelectedUserId('');
    setShowAdvancedOverrides(false);
    setDraft({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'FRONT_OFFICE',
      isActive: true,
      permissions: buildPermissionsForRole('FRONT_OFFICE', catalog),
    });
  };

  const startEdit = (user: ManagedUser) => {
    const normalizedRole = normalizeSupportedRole(user.role);
    setIsCreating(false);
    setShowAdvancedOverrides(false);
    setDraft({
      fullName: user.fullName,
      username: user.username ?? '',
      email: user.email,
      password: '',
      role: normalizedRole,
      isActive: user.isActive,
      permissions:
        user.permissions.length > 0
          ? catalog.map((item) => user.permissions.find((entry) => entry.moduleKey === item.key) ?? blankPermission(item.key))
          : buildPermissionsForRole(normalizedRole, catalog),
    });
  };

  useEffect(() => {
    if (selectedUser && catalog.length > 0 && !isCreating) {
      startEdit(selectedUser);
    }
  }, [catalog, isCreating, selectedUser]);

  const updatePermission = (
    moduleKey: string,
    key: keyof Omit<UserPermissionInput, 'moduleKey'>,
    value: boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.map((permission) =>
        permission.moduleKey === moduleKey ? { ...permission, [key]: value } : permission,
      ),
    }));
  };

  const handleRoleChange = (role: SupportedRole) => {
    setDraft((current) => ({
      ...current,
      role,
      permissions: buildPermissionsForRole(role, catalog),
    }));
  };

  const handleSave = async () => {
    if (!draft.fullName.trim() || !draft.username.trim()) {
      toast.error('Name and username are required');
      return;
    }

    if (isCreating && draft.password.trim().length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        fullName: draft.fullName.trim(),
        username: draft.username.trim(),
        email: draft.email.trim() || undefined,
        password: draft.password,
        role: activeRole,
        isActive: draft.isActive,
        permissions: filteredPermissions,
      };

      const savedUser = isCreating
        ? await usersApi.createUser(payload)
        : await usersApi.updateUser(selectedUserId, {
            fullName: payload.fullName,
            username: payload.username,
            email: payload.email,
            password: payload.password || undefined,
            role: payload.role,
            isActive: payload.isActive,
            permissions: payload.permissions,
          });

      const refreshedUsers = await usersApi.fetchUsers();
      setUsers(refreshedUsers);
      setSelectedUserId(savedUser.id);
      setIsCreating(false);
      setShowAdvancedOverrides(false);
      toast.success('User access saved', {
        description: `${savedUser.fullName} is ready to use VenueOps ERP.`,
      });
    } catch (error) {
      toast.error('Failed to save user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 size-4.5 text-red-600" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Development Stage Access Control</h3>
            <p className="mt-0.5 text-xs text-red-700">
              {userName} is managing testing-mode user accounts. Assign the working role each user should receive after login.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#2E2E2E]">Users</h3>
              <p className="text-xs text-[#6B7280]">{users.length} account(s)</p>
            </div>
            <Button onClick={startCreate} className="h-8 bg-[#1F3A5F] px-3 text-xs hover:bg-[#2C5282]">
              <UserPlus className="mr-1.5 size-3.5" />
              New User
            </Button>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setIsCreating(false);
                  setSelectedUserId(user.id);
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedUserId === user.id && !isCreating
                    ? 'border-[#1F3A5F] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-[#2E2E2E]">{user.fullName}</div>
                <div className="text-[11px] text-[#6B7280]">{user.username ?? user.email}</div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[#2E2E2E]">
                    {getRoleLabel(user.role)}
                  </span>
                  <span className={user.isActive ? 'text-green-700' : 'text-red-600'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <Users className="size-4.5 text-[#1F3A5F]" />
            <div>
              <h3 className="text-sm font-semibold text-[#2E2E2E]">
                {isCreating ? 'Create User' : selectedUser ? `Edit ${selectedUser.fullName}` : 'Select a User'}
              </h3>
              <p className="text-xs text-[#6B7280]">Simple role assignment for development stage access.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Full Name</Label>
              <Input value={draft.fullName} onChange={(e) => setDraft((current) => ({ ...current, fullName: e.target.value }))} />
            </div>
            <div>
              <Label>User Name</Label>
              <Input value={draft.username} onChange={(e) => setDraft((current) => ({ ...current, username: e.target.value }))} />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={draft.email} onChange={(e) => setDraft((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div>
              <Label>{isCreating ? 'Password' : 'New Password (optional)'}</Label>
              <Input
                type="password"
                value={draft.password}
                onChange={(e) => setDraft((current) => ({ ...current, password: e.target.value }))}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={activeRole}
                onChange={(e) => handleRoleChange(e.target.value as SupportedRole)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <Switch checked={draft.isActive} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))} />
            <div>
              <div className="text-sm font-medium text-[#2E2E2E]">Active account</div>
              <div className="text-[11px] text-[#6B7280]">Inactive users cannot log in.</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{roleSummary.title}</div>
                <div className="mt-0.5 text-xs text-slate-600">{roleSummary.description}</div>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                {roleOptions.find((role) => role.value === activeRole)?.summary}
              </span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {roleSummary.modules.map((module) => (
                <div key={module} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700">
                  {module}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white">
            <button
              type="button"
              onClick={() => setShowAdvancedOverrides((current) => !current)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <div>
                <div className="text-sm font-medium text-[#2E2E2E]">Advanced Overrides</div>
                <div className="text-[11px] text-[#6B7280]">Hidden by default. Use only when you need temporary exceptions.</div>
              </div>
              <ChevronDown className={`size-4 text-gray-500 transition-transform ${showAdvancedOverrides ? 'rotate-180' : ''}`} />
            </button>

            {showAdvancedOverrides && (
              <div className="border-t border-gray-200 px-3 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-[#2E2E2E]">Permission Matrix</h4>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setDraft((current) => ({ ...current, permissions: buildPermissionsForRole(activeRole, catalog) }))}>
                      Reset to Role Default
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Module</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">View</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Create</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Edit</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Delete</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Approve</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Export</th>
                        <th className="px-4 py-3 font-medium text-[#2E2E2E]">Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.map((item) => {
                        const permission = draft.permissions.find((entry) => entry.moduleKey === item.key) ?? blankPermission(item.key);

                        return (
                          <tr key={item.key} className="border-t border-gray-200">
                            <td className="px-4 py-3 font-medium text-[#2E2E2E]">{item.label}</td>
                            {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove', 'canExport', 'canManage'] as const).map((flag) => (
                              <td key={flag} className="px-4 py-3">
                                <Switch
                                  checked={permission[flag]}
                                  onCheckedChange={(checked) => updatePermission(item.key, flag, checked)}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedUser) {
                  startEdit(selectedUser);
                } else {
                  startCreate();
                }
              }}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#1F3A5F] hover:bg-[#2C5282]">
              {isSaving ? 'Saving...' : 'Save User Access'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
