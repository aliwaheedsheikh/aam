import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users2,
  ChefHat,
  Users,
  Banknote,
  Package,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  UserCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import { PermissionFlags } from '@/app/lib/authTypes';
import { canAccessModuleForRole, MODULE_KEYS } from '@/app/lib/permissions';

type Module = {
  id: string;
  name: string;
  icon: any;
  moduleKeys: string[];
  activePrefixes?: string[];
  subModules?: { id: string; name: string; route?: string; moduleKey?: string }[];
};

interface SidebarProps {
  currentModule: string;
  onModuleChange: (moduleId: string) => void;
  userRole: string;
  userName: string;
  permissions: PermissionFlags[];
  onLogout: () => void;
}

export function Sidebar({
  currentModule,
  onModuleChange,
  userRole,
  userName,
  permissions,
  onLogout,
}: SidebarProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>(['reservations']);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isFrontOffice = userRole === 'front-office';
  const safeUserName = userName?.trim() || 'User';
  const userInitial = safeUserName.charAt(0).toUpperCase();

  const modules: Module[] = [
    {
      id: 'dashboard',
      name: isFrontOffice ? 'Reservation Dashboard' : 'Dashboard',
      icon: LayoutDashboard,
      moduleKeys: [MODULE_KEYS.dashboard],
    },
    {
      id: 'reservations',
      name: isFrontOffice ? 'Reservation Workspace' : 'Reservations',
      icon: Calendar,
      moduleKeys: [MODULE_KEYS.reservations],
      activePrefixes: ['reservations', 'event-availability-calendar', 'tentative-follow-up', 'payment-follow-up'],
      subModules: [
        { id: 'calendar', name: 'Confirmed Reservations', route: 'reservations-bookings' },
        { id: 'outside-services', name: 'Outside Services', route: 'reservations-outside-services' },
        { id: 'event-availability-calendar', name: 'Tentative Reservations', route: 'event-availability-calendar' },
        { id: 'follow-up', name: 'Follow-Up Center', route: 'reservations-follow-up' },
        { id: 'reports', name: 'Reports', route: 'reservations-reports' },
        { id: 'reservation-setup', name: 'Reservation Setup' },
      ],
    },
    {
      id: 'banquet-kitchen',
      name: 'Banquet Kitchen',
      icon: ChefHat,
      moduleKeys: [MODULE_KEYS.banquetKitchen],
      subModules: [
        { id: 'management', name: 'Menu Engineering' },
        { id: 'production', name: 'F&B Director Planning' },
        { id: 'unit-setup', name: 'Unit Setup' },
      ],
    },
    {
      id: 'restaurant-kitchen',
      name: 'Restaurant Kitchen',
      icon: ChefHat,
      moduleKeys: [MODULE_KEYS.restaurantKitchen],
      subModules: [
        { id: 'production', name: 'Daily Production' },
        { id: 'menu', name: 'Menu Categories' },
        { id: 'recipes', name: 'Portion Recipes' },
        { id: 'unit-setup', name: 'Unit Setup' },
      ],
    },
    {
      id: 'accounts-finance',
      name: 'Accounts & Finance',
      icon: Banknote,
      moduleKeys: [MODULE_KEYS.accountsFinance],
    },
    {
      id: 'customer-database',
      name: 'Customer Database',
      icon: UserCircle,
      moduleKeys: [MODULE_KEYS.customerDatabase],
    },
    {
      id: 'kitchen-purchase',
      name: 'Kitchen Purchase',
      icon: Package,
      moduleKeys: [MODULE_KEYS.inventory, MODULE_KEYS.procurement],
      activePrefixes: ['inventory', 'procurement-management'],
      subModules: [
        { id: 'purchase', name: 'Purchase', route: 'procurement-management', moduleKey: MODULE_KEYS.procurement },
        { id: 'stocks', name: 'Stocks', route: 'inventory-stock', moduleKey: MODULE_KEYS.inventory },
      ],
    },
    {
      id: 'hr',
      name: 'Human Resources',
      icon: Users,
      moduleKeys: ['hr'],
      subModules: [
        { id: 'employees', name: 'Employee Database' },
        { id: 'attendance', name: 'Attendance' },
        { id: 'payroll', name: 'Payroll' },
        { id: 'leave', name: 'Leave Management' },
        { id: 'performance', name: 'Performance' },
      ],
    },
    {
      id: 'vehicles',
      name: 'Vehicle Management',
      icon: Users2,
      moduleKeys: ['vehicles'],
      subModules: [
        { id: 'fleet', name: 'Fleet Overview' },
        { id: 'maintenance', name: 'Maintenance' },
        { id: 'fuel', name: 'Fuel Tracking' },
        { id: 'drivers', name: 'Driver Management' },
      ],
    },
    {
      id: 'assets',
      name: 'Fixed Assets',
      icon: Settings,
      moduleKeys: ['assets'],
      subModules: [
        { id: 'asset-register', name: 'Asset Register' },
        { id: 'depreciation', name: 'Depreciation' },
        { id: 'maintenance-schedule', name: 'Maintenance Schedule' },
      ],
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      icon: Menu,
      moduleKeys: [MODULE_KEYS.reports],
      subModules: [
        { id: 'revenue', name: 'Revenue Reports' },
        { id: 'occupancy', name: 'Occupancy Reports' },
        { id: 'cost-reports', name: 'Cost Analysis' },
        { id: 'custom', name: 'Custom Reports' },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      moduleKeys: ['settings'],
    },
    {
      id: 'setup',
      name: 'Master Setup',
      icon: Settings,
      moduleKeys: [MODULE_KEYS.setup],
    },
  ];

  const getVisibleSubModules = (module: Module) => {
    const subModules = (module.subModules ?? []).filter(
      (subModule) =>
        !subModule.moduleKey || canAccessModuleForRole(userRole, permissions, subModule.moduleKey, 'view'),
    );
    if (module.id !== 'reservations') {
      return subModules;
    }

    const allowedFrontOfficeSubModules = new Set([
      'calendar',
      'event-availability-calendar',
      'follow-up',
      'reports',
    ]);

    if (isFrontOffice) {
      return subModules.filter((subModule) => allowedFrontOfficeSubModules.has(subModule.id));
    }

    return subModules;
  };

  const availableModules = modules
    .map((module) => ({
      ...module,
      subModules: module.subModules ? getVisibleSubModules(module) : undefined,
    }))
    .filter(
      (module) =>
        module.moduleKeys.some((moduleKey) => canAccessModuleForRole(userRole, permissions, moduleKey, 'view')) &&
        (!module.subModules || module.subModules.length > 0),
    );

  const toggleExpand = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleModuleClick = (moduleId: string, hasSubModules: boolean) => {
    if (hasSubModules) {
      toggleExpand(moduleId);
    } else {
      onModuleChange(moduleId);
    }
  };

  const handleSubModuleClick = (parentId: string, subModuleId: string, route?: string) => {
    onModuleChange(route ?? `${parentId}-${subModuleId}`);
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      'front-office': 'Front Office',
      'general-manager': 'General Manager',
      accounts: 'Accounts',
      'banquet-chef': 'Banquet Chef',
      'restaurant-chef': 'Restaurant Chef',
      'hr-manager': 'HR Manager',
      admin: 'Admin',
    };
    return roleNames[role] || role;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className={`bg-gray-900 text-white flex flex-col h-full transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo & Company Name */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Banquet ERP</h1>
              <p className="text-xs text-gray-400 mt-1">Enterprise Management System</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-5 text-gray-400" />
            ) : (
              <PanelLeftClose className="size-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-10 bg-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {userInitial}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <div>
                    <p className="font-semibold">{safeUserName}</p>
                    <p className="text-xs text-gray-500">{getRoleName(userRole)}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{safeUserName}</div>
                <div className="text-xs text-gray-400 truncate">{getRoleName(userRole)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
            {availableModules.map(module => {
              const Icon = module.icon;
              const isExpanded = expandedModules.includes(module.id);
              const activePrefixes = module.activePrefixes ?? [module.id];
              const isActive = activePrefixes.some(
                (prefix) => currentModule === prefix || currentModule.startsWith(`${prefix}-`),
              );
              const hasSubModules = module.subModules && module.subModules.length > 0;

              return (
                <div key={module.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleModuleClick(module.id, !!hasSubModules)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        <Icon className="size-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium leading-tight">
                              {module.name}
                            </span>
                            {hasSubModules && (
                              isExpanded ? (
                                <ChevronDown className="size-4 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="size-4 flex-shrink-0" />
                              )
                            )}
                          </>
                        )}
                      </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        <p>{module.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {/* Sub-modules */}
                  {!isCollapsed && hasSubModules && isExpanded && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      {module.subModules!.map(subModule => {
                        const subModuleFullId = `${module.id}-${subModule.id}`;
                        const targetRoute = subModule.route ?? subModuleFullId;
                        const isSubActive = currentModule === targetRoute;

                        return (
                          <button
                            key={subModule.id}
                            onClick={() => handleSubModuleClick(module.id, subModule.id, subModule.route)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                              isSubActive
                                ? 'bg-gray-800 text-white font-medium'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            {subModule.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <LogOut className="size-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
