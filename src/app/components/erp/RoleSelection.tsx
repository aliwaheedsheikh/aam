import { useState } from 'react';
import { Button } from '../ui/button';
import { Building2, ChevronDown } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface RoleSelectionProps {
  onSelectRole: (role: string, rememberRole: boolean) => void;
  userEmail: string;
}

export function RoleSelection({ onSelectRole, userEmail }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [rememberRole, setRememberRole] = useState(true);

  const roles: Role[] = [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full ERP access, setup controls, and Users & Roles management',
    },
    {
      id: 'general-manager',
      name: 'General Manager',
      description: 'Operational control across reservations, reporting, accounts visibility, and approvals',
    },
    {
      id: 'front-office',
      name: 'Front Office',
      description: 'Reservation dashboard, availability calendar, confirmations, and payment follow-ups',
    },
    {
      id: 'accounts',
      name: 'Accounts',
      description: 'Accounts, finance, payment follow-up, ledgers, and financial reporting',
    },
    {
      id: 'banquet-chef',
      name: 'Banquet Chef',
      description: 'Banquet kitchen planning, menus, production, and inventory visibility',
    },
    {
      id: 'restaurant-chef',
      name: 'Restaurant Chef',
      description: 'Restaurant kitchen production, menu categories, recipes, and stock visibility',
    },
    {
      id: 'hr-manager',
      name: 'HR Manager',
      description: 'Human resource workspace and employee administration',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      onSelectRole(selectedRole, rememberRole);
    }
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <Building2 className="size-8 text-[#1F3A5F]" strokeWidth={2} />
            <h1 className="text-2xl font-semibold text-[#2E2E2E] tracking-tight">
              VenueOps ERP
            </h1>
          </div>
          <p className="text-sm text-[#6B7280]">
            Welcome, <span className="font-medium text-[#2E2E2E]">{userEmail}</span>
          </p>
        </div>

        {/* Role Selection Card */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-7">
          <h2 className="text-base font-semibold text-[#2E2E2E] mb-5">
            Select Your Role
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Dropdown */}
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">
                Role
              </label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1F3A5F] focus:border-transparent transition-colors text-[#2E2E2E] bg-white appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
              </div>
              
              {/* Role Description */}
              {selectedRoleData && (
                <p className="mt-2 text-xs text-[#6B7280]">
                  {selectedRoleData.description}
                </p>
              )}
            </div>

            {/* Remember Role Checkbox */}
            <div className="pt-3 border-t border-gray-200">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberRole}
                  onChange={(e) => setRememberRole(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-[#1F3A5F] focus:ring-[#1F3A5F] cursor-pointer"
                />
                <span className="text-sm text-[#2E2E2E]">Remember my role</span>
              </label>
            </div>

            {/* Continue Button */}
            <Button
              type="submit"
              disabled={!selectedRole}
              className="w-full py-2.5 text-sm font-medium bg-[#1F3A5F] hover:bg-[#2C5282] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#9CA3AF]">
          © 2026 VenueOps ERP. All rights reserved.
        </div>
      </div>
    </div>
  );
}
