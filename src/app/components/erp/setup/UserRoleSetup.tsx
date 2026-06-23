import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  Key,
  UserCheck,
  UserX,
  Clock,
  Info,
  Briefcase,
  Settings,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

interface User {
  id: string;
  
  // Basic Information
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password?: string; // Only for new users
  
  // Role & Access
  role: 'super-admin' | 'general-manager' | 'front-office' | 'accounts' | 'kitchen-manager' | 'purchase-manager';
  
  // Venue Access Permissions
  venueAccess: string[]; // Array of venue IDs
  accessAllVenues: boolean;
  
  // Discount Limits
  maxDiscountPercentage: number;
  requiresApprovalAbove: number; // Percentage threshold
  canOverrideSystemLimits: boolean;
  
  // Status & Security
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  
  // Audit Trail
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  
  // Additional Notes
  notes?: string;
}

interface Venue {
  id: string;
  venueName: string;
  venueCode: string;
  location: string;
  isActive: boolean;
}

interface UserRoleSetupProps {
  currentUser: string;
  currentUserRole: string;
}

export function UserRoleSetup({ currentUser, currentUserRole }: UserRoleSetupProps) {
  // Mock Data - Venues
  const [venues] = useState<Venue[]>([
    { id: '1', venueName: 'Grand Ballroom', venueCode: 'VEN001', location: 'Main Building, Floor 2', isActive: true },
    { id: '2', venueName: 'Royal Hall', venueCode: 'VEN002', location: 'East Wing, Floor 1', isActive: true },
    { id: '3', venueName: 'Executive Lounge', venueCode: 'VEN003', location: 'West Wing, Floor 3', isActive: true },
    { id: '4', venueName: 'Garden Terrace', venueCode: 'VEN004', location: 'Outdoor Area', isActive: true },
    { id: '5', venueName: 'Crystal Room', venueCode: 'VEN005', location: 'Main Building, Floor 1', isActive: true },
  ]);

  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      fullName: 'Admin User',
      username: 'admin',
      email: 'admin@venueops.com',
      phone: '+92-300-1234567',
      role: 'super-admin',
      venueAccess: [],
      accessAllVenues: true,
      maxDiscountPercentage: 100,
      requiresApprovalAbove: 50,
      canOverrideSystemLimits: true,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      createdAt: new Date('2024-01-01'),
      createdBy: 'System',
      lastLoginAt: new Date('2025-01-09T10:30:00'),
      lastLoginIP: '192.168.1.100',
      notes: 'System administrator with full access to all modules.',
    },
    {
      id: '2',
      fullName: 'Sarah Khan',
      username: 'sarah.khan',
      email: 'sarah@venueops.com',
      phone: '+92-300-2345678',
      role: 'general-manager',
      venueAccess: ['1', '2', '3'],
      accessAllVenues: false,
      maxDiscountPercentage: 25,
      requiresApprovalAbove: 15,
      canOverrideSystemLimits: true,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      createdAt: new Date('2024-01-15'),
      createdBy: 'Admin User',
      lastLoginAt: new Date('2025-01-09T09:15:00'),
      lastLoginIP: '192.168.1.105',
      notes: 'Oversees Grand Ballroom, Royal Hall, and Executive Lounge operations.',
    },
    {
      id: '3',
      fullName: 'Ali Raza',
      username: 'ali.raza',
      email: 'ali@venueops.com',
      phone: '+92-300-3456789',
      role: 'front-office',
      venueAccess: ['1', '2'],
      accessAllVenues: false,
      maxDiscountPercentage: 10,
      requiresApprovalAbove: 5,
      canOverrideSystemLimits: false,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      createdAt: new Date('2024-02-01'),
      createdBy: 'Admin User',
      lastLoginAt: new Date('2025-01-09T08:45:00'),
      lastLoginIP: '192.168.1.110',
      notes: 'Handles customer bookings for Grand Ballroom and Royal Hall.',
    },
    {
      id: '4',
      fullName: 'Fatima Ahmed',
      username: 'fatima.ahmed',
      email: 'fatima@venueops.com',
      phone: '+92-300-4567890',
      role: 'accounts',
      venueAccess: [],
      accessAllVenues: true,
      maxDiscountPercentage: 0,
      requiresApprovalAbove: 0,
      canOverrideSystemLimits: false,
      isActive: true,
      isLocked: false,
      mustChangePassword: false,
      createdAt: new Date('2024-02-15'),
      createdBy: 'Admin User',
      lastLoginAt: new Date('2025-01-08T17:30:00'),
      lastLoginIP: '192.168.1.115',
      notes: 'Manages financial records and invoicing for all venues.',
    },
    {
      id: '5',
      fullName: 'Hassan Malik',
      username: 'hassan.malik',
      email: 'hassan@venueops.com',
      phone: '+92-300-5678901',
      role: 'front-office',
      venueAccess: ['4', '5'],
      accessAllVenues: false,
      maxDiscountPercentage: 8,
      requiresApprovalAbove: 5,
      canOverrideSystemLimits: false,
      isActive: false,
      isLocked: true,
      mustChangePassword: true,
      createdAt: new Date('2024-03-01'),
      createdBy: 'Admin User',
      lastLoginAt: new Date('2024-12-20T14:20:00'),
      lastLoginIP: '192.168.1.120',
      notes: 'Account locked due to multiple failed login attempts. Contact admin to unlock.',
    },
  ]);

  const [selectedUser, setSelectedUser] = useState<User | null>(users[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  const roles = [
    {
      id: 'super-admin',
      name: 'Super Admin',
      color: 'red',
      description: 'Full system access. Can manage all modules, users, and settings.',
      permissions: ['All Modules', 'User Management', 'System Settings', 'Full Discount Authority'],
    },
    {
      id: 'general-manager',
      name: 'General Manager',
      color: 'blue',
      description: 'Oversees operations. Can access all reports and approve high-value transactions.',
      permissions: ['All Reports', 'Approve Discounts', 'Venue Management', 'Staff Oversight'],
    },
    {
      id: 'front-office',
      name: 'Front Office',
      color: 'green',
      description: 'Customer-facing role. Creates bookings, handles inquiries, limited discount authority.',
      permissions: ['Create Bookings', 'View Calendar', 'Limited Discounts', 'Customer Management'],
    },
    {
      id: 'accounts',
      name: 'Accounts',
      color: 'purple',
      description: 'Financial operations. Manages invoicing, payments, and financial reports.',
      permissions: ['Invoicing', 'Payment Recording', 'Financial Reports', 'No Discount Authority'],
    },
    {
      id: 'kitchen-manager',
      name: 'Kitchen Manager',
      color: 'orange',
      description: 'Manages kitchen operations, menu planning, and inventory.',
      permissions: ['Kitchen Dashboard', 'Menu Management', 'Inventory View', 'No Financial Access'],
    },
    {
      id: 'purchase-manager',
      name: 'Purchase Manager',
      color: 'teal',
      description: 'Handles procurement, vendor management, and purchase orders.',
      permissions: ['Purchase Orders', 'Vendor Management', 'Inventory Management', 'No Customer Access'],
    },
  ];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateNew = () => {
    const newUser: User = {
      id: `temp-${Date.now()}`,
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'front-office',
      venueAccess: [],
      accessAllVenues: false,
      maxDiscountPercentage: 10,
      requiresApprovalAbove: 5,
      canOverrideSystemLimits: false,
      isActive: true,
      isLocked: false,
      mustChangePassword: true,
      createdAt: new Date(),
      createdBy: currentUser,
    };

    setEditedUser(newUser);
    setSelectedUser(newUser);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = () => {
    if (selectedUser) {
      setEditedUser({ ...selectedUser });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editedUser) return;

    // Validation
    if (!editedUser.fullName.trim()) {
      alert('Full Name is required');
      return;
    }
    if (!editedUser.username.trim()) {
      alert('Username is required');
      return;
    }
    if (!editedUser.email.trim()) {
      alert('Email is required');
      return;
    }
    if (isCreating && !editedUser.password) {
      alert('Password is required for new users');
      return;
    }
    if (!editedUser.accessAllVenues && editedUser.venueAccess.length === 0) {
      alert('Please select at least one venue or enable "Access All Venues"');
      return;
    }

    if (isCreating) {
      const newUser = {
        ...editedUser,
        id: Date.now().toString(),
        createdAt: new Date(),
        createdBy: currentUser,
      };
      setUsers([...users, newUser]);
      setSelectedUser(newUser);
      setIsCreating(false);
    } else {
      setUsers(
        users.map((u) =>
          u.id === editedUser.id ? { ...editedUser, updatedAt: new Date(), updatedBy: currentUser } : u
        )
      );
      setSelectedUser(editedUser);
    }

    setIsEditing(false);
    setEditedUser(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(null);
    if (isCreating) {
      setSelectedUser(users[0] || null);
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (!selectedUser || !window.confirm(`Are you sure you want to delete user "${selectedUser.fullName}"?`))
      return;

    if (selectedUser.id === '1') {
      alert('Cannot delete system administrator');
      return;
    }

    setUsers(users.filter((u) => u.id !== selectedUser.id));
    setSelectedUser(users[0] || null);
  };

  const handleToggleStatus = () => {
    if (!selectedUser) return;

    const updatedUser = { ...selectedUser, isActive: !selectedUser.isActive };
    setUsers(users.map((u) => (u.id === selectedUser.id ? updatedUser : u)));
    setSelectedUser(updatedUser);
  };

  const handleToggleLock = () => {
    if (!selectedUser) return;

    const updatedUser = { ...selectedUser, isLocked: !selectedUser.isLocked };
    setUsers(users.map((u) => (u.id === selectedUser.id ? updatedUser : u)));
    setSelectedUser(updatedUser);
  };

  const getRoleBadgeColor = (role: string) => {
    const roleObj = roles.find((r) => r.id === role);
    return roleObj?.color || 'gray';
  };

  const getRoleName = (role: string) => {
    const roleObj = roles.find((r) => r.id === role);
    return roleObj?.name || role;
  };

  const getVenueNames = (venueIds: string[]) => {
    if (venueIds.length === 0) return 'None';
    return venueIds
      .map((id) => venues.find((v) => v.id === id)?.venueName)
      .filter(Boolean)
      .join(', ');
  };

  const activeUser = editedUser || selectedUser;

  return (
    <div className="space-y-4">
      {/* Security Banner */}
      <div className="bg-gradient-to-r from-red-900 to-orange-900 text-white rounded-lg p-4 border-2 border-red-700">
        <div className="flex items-start gap-3">
          <Shield className="size-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg mb-1">User & Role Management - Security Critical</h3>
            <p className="text-sm text-red-100 mb-2">
              This module controls system access, role boundaries, and operational permissions. Changes here
              directly affect who can access what data, approve transactions, and perform system operations.
            </p>
            <div className="flex items-center gap-2 text-xs bg-white/10 rounded px-3 py-1.5 w-fit">
              <AlertTriangle className="size-3" />
              <span>Only Super Admin and General Manager can access this module.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Information Guide */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 flex-1">
            <Info className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <h4 className="font-semibold text-blue-900">Role Boundaries & Permissions</h4>
          </div>
          <Button
            onClick={() => setShowRoleGuide(!showRoleGuide)}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {showRoleGuide ? (
              <>
                <EyeOff className="size-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <Eye className="size-4 mr-2" />
                Show
              </>
            )}
          </Button>
        </div>
        {showRoleGuide && (
          <div className="grid grid-cols-3 gap-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-lg p-3 border-2 border-blue-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold bg-${role.color}-100 text-${role.color}-700`}
                  >
                    {role.name}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mb-2">{role.description}</p>
                <div className="space-y-1">
                  {role.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                      <CheckCircle2 className="size-3 text-green-600" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border-2 border-gray-300 p-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Role:</Label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Status:</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className={`flex gap-5 ${showRoleGuide ? 'h-[calc(100vh-760px)]' : 'h-[calc(100vh-280px)]'}`}>
        {/* LEFT PANEL - User List */}
        <div className="w-96 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col">
          {/* Header */}
          <div className="p-4 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Users className="size-5 text-blue-600" />
                Users ({filteredUsers.length})
              </h3>
              <Button
                onClick={handleCreateNew}
                disabled={isEditing}
                className="bg-blue-600 hover:bg-blue-700 h-8"
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                New User
              </Button>
            </div>
            <div className="text-xs text-gray-600 bg-white rounded px-2 py-1 border border-gray-200">
              <span className="font-semibold">Active:</span> {users.filter((u) => u.isActive).length} |{' '}
              <span className="font-semibold">Inactive:</span> {users.filter((u) => !u.isActive).length}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Users className="size-12 text-gray-300 mx-auto mb-2" />
                <p>No users found</p>
                <p className="text-xs mt-1">Adjust filters or click "New User"</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredUsers.map((user) => {
                  const roleColor = getRoleBadgeColor(user.role);

                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedUser(user);
                        }
                      }}
                      disabled={isEditing}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-colors border-2 ${
                        selectedUser?.id === user.id
                          ? 'bg-blue-50 border-blue-500 shadow-md'
                          : 'hover:bg-gray-50 border-transparent'
                      } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-[#2E2E2E] truncate">{user.fullName}</h4>
                            {user.isLocked && <Lock className="size-3 text-red-600 flex-shrink-0" />}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">@{user.username}</div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium bg-${roleColor}-100 text-${roleColor}-700`}
                            >
                              {getRoleName(user.role)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Building2 className="size-3" />
                              <span>
                                {user.accessAllVenues
                                  ? 'All Venues'
                                  : `${user.venueAccess.length} venue(s)`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <DollarSign className="size-3" />
                              <span>Max Discount: {user.maxDiscountPercentage}%</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={`size-4 text-gray-400 flex-shrink-0 mt-1 ${
                            selectedUser?.id === user.id ? 'text-blue-600' : ''
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - User Details */}
        <div className="flex-1 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col">
          {!activeUser ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="size-16 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">Select a user to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-5 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-semibold text-[#2E2E2E]">
                        {isCreating ? 'Create New User' : activeUser.fullName || 'Unnamed User'}
                      </h2>
                      {activeUser.isLocked && (
                        <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                          <Lock className="size-3" />
                          LOCKED
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      {!isCreating && (
                        <>
                          <span className="font-mono">@{activeUser.username}</span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              activeUser.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {activeUser.isActive ? '● ACTIVE' : '○ INACTIVE'}
                          </span>
                          {activeUser.lastLoginAt && (
                            <>
                              <span>•</span>
                              <span className="text-xs">
                                Last login: {activeUser.lastLoginAt.toLocaleDateString()}{' '}
                                {activeUser.lastLoginAt.toLocaleTimeString()}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        {!isCreating && (
                          <>
                            <Button
                              onClick={handleToggleLock}
                              variant="outline"
                              className={
                                activeUser.isLocked
                                  ? 'border-green-300 text-green-700 hover:bg-green-50'
                                  : 'border-red-300 text-red-700 hover:bg-red-50'
                              }
                            >
                              {activeUser.isLocked ? (
                                <>
                                  <Unlock className="size-4 mr-2" />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <Lock className="size-4 mr-2" />
                                  Lock
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleToggleStatus}
                              variant="outline"
                              className={
                                activeUser.isActive
                                  ? 'border-red-300 text-red-700 hover:bg-red-50'
                                  : 'border-green-300 text-green-700 hover:bg-green-50'
                              }
                            >
                              {activeUser.isActive ? (
                                <>
                                  <UserX className="size-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                          <Edit2 className="size-4 mr-2" />
                          Edit
                        </Button>
                        {!isCreating && activeUser.id !== '1' && (
                          <Button
                            onClick={handleDelete}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button onClick={handleCancel} variant="outline">
                          <X className="size-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                          <Save className="size-4 mr-2" />
                          Save User
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl space-y-6">
                  {/* Security Warning */}
                  {isEditing && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-700">
                            <strong>Security Notice:</strong> Changes to roles, permissions, and discount
                            limits affect system access control. Verify all settings before saving.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-gray-300">
                      <Info className="size-5 text-blue-600" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={activeUser.fullName}
                          onChange={(e) => setEditedUser({ ...activeUser, fullName: e.target.value })}
                          disabled={!isEditing}
                          placeholder="e.g., Sarah Khan"
                          className={`${!isEditing ? 'bg-gray-50' : 'bg-white'} text-base`}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold">
                          Username <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={activeUser.username}
                          onChange={(e) =>
                            setEditedUser({ ...activeUser, username: e.target.value.toLowerCase() })
                          }
                          disabled={!isEditing || !isCreating}
                          placeholder="e.g., sarah.khan"
                          className={`${!isEditing || !isCreating ? 'bg-gray-50' : 'bg-white'} text-base font-mono`}
                        />
                        {!isCreating && (
                          <p className="text-xs text-gray-500 mt-1">Username cannot be changed after creation</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          value={activeUser.email}
                          onChange={(e) => setEditedUser({ ...activeUser, email: e.target.value })}
                          disabled={!isEditing}
                          placeholder="e.g., sarah@venueops.com"
                          className={`${!isEditing ? 'bg-gray-50' : 'bg-white'} text-base`}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold">Phone Number</Label>
                        <Input
                          type="tel"
                          value={activeUser.phone}
                          onChange={(e) => setEditedUser({ ...activeUser, phone: e.target.value })}
                          disabled={!isEditing}
                          placeholder="+92-300-1234567"
                          className={`${!isEditing ? 'bg-gray-50' : 'bg-white'} text-base`}
                        />
                      </div>
                      {(isCreating || isEditing) && (
                        <div className="col-span-2">
                          <Label className="text-sm mb-1.5 font-semibold">
                            Password {isCreating && <span className="text-red-500">*</span>}
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={activeUser.password || ''}
                              onChange={(e) => setEditedUser({ ...activeUser, password: e.target.value })}
                              disabled={!isEditing}
                              placeholder={isCreating ? 'Set initial password' : 'Leave blank to keep current'}
                              className={`${!isEditing ? 'bg-gray-50' : 'bg-white'} text-base pr-10`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {isCreating
                              ? 'User will be required to change password on first login'
                              : 'Only fill if you want to reset the password'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role & Access Control */}
                  <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-purple-300">
                      <Briefcase className="size-5 text-purple-600" />
                      Role & Access Control
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold flex items-center gap-2">
                          <Shield className="size-4 text-purple-600" />
                          Assigned Role <span className="text-red-500">*</span>
                        </Label>
                        <select
                          value={activeUser.role}
                          onChange={(e) => setEditedUser({ ...activeUser, role: e.target.value as any })}
                          disabled={!isEditing}
                          className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm ${
                            !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                          }`}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name} - {role.description}
                            </option>
                          ))}
                        </select>
                        {activeUser.role && (
                          <div className="mt-3 bg-white rounded p-3 border border-purple-200">
                            <p className="text-xs font-semibold text-purple-900 mb-2">Role Permissions:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {roles
                                .find((r) => r.id === activeUser.role)
                                ?.permissions.map((perm, idx) => (
                                  <div key={idx} className="flex items-center gap-1 text-xs text-gray-700">
                                    <CheckCircle2 className="size-3 text-green-600" />
                                    <span>{perm}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Venue Access Permissions */}
                  <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-green-300">
                      <Building2 className="size-5 text-green-600" />
                      Venue Access Permissions
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-green-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeUser.accessAllVenues}
                          onChange={(e) =>
                            setEditedUser({
                              ...activeUser,
                              accessAllVenues: e.target.checked,
                              venueAccess: e.target.checked ? [] : activeUser.venueAccess,
                            })
                          }
                          disabled={!isEditing}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-green-900">
                            Grant Access to All Venues
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            User can access all venues including future venues added to the system
                          </p>
                        </div>
                      </label>

                      {!activeUser.accessAllVenues && (
                        <div>
                          <Label className="text-sm mb-2 font-semibold block">
                            Select Specific Venues <span className="text-red-500">*</span>
                          </Label>
                          <div className="space-y-2 bg-white rounded-lg border border-green-200 p-3">
                            {venues.map((venue) => (
                              <label
                                key={venue.id}
                                className="flex items-start gap-3 p-2 rounded hover:bg-green-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={activeUser.venueAccess.includes(venue.id)}
                                  onChange={(e) => {
                                    const newAccess = e.target.checked
                                      ? [...activeUser.venueAccess, venue.id]
                                      : activeUser.venueAccess.filter((id) => id !== venue.id);
                                    setEditedUser({ ...activeUser, venueAccess: newAccess });
                                  }}
                                  disabled={!isEditing}
                                  className="mt-1 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">
                                    {venue.venueName}
                                    <span className="ml-2 text-xs font-mono text-gray-500">
                                      {venue.venueCode}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">{venue.location}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-green-700 mt-2">
                            Selected: {activeUser.venueAccess.length} of {venues.length} venues
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discount Limits */}
                  <div className="border-2 border-orange-200 rounded-lg p-5 bg-orange-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-orange-300">
                      <DollarSign className="size-5 text-orange-600" />
                      Discount Authority & Limits
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm mb-1.5 font-semibold">
                            Maximum Discount (%) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={activeUser.maxDiscountPercentage}
                            onChange={(e) =>
                              setEditedUser({
                                ...activeUser,
                                maxDiscountPercentage: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={!isEditing}
                            className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum discount user can apply without approval (0-100%)
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm mb-1.5 font-semibold">
                            Requires Approval Above (%)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={activeUser.requiresApprovalAbove}
                            onChange={(e) =>
                              setEditedUser({
                                ...activeUser,
                                requiresApprovalAbove: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={!isEditing}
                            className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Discount above this requires manager approval
                          </p>
                        </div>
                      </div>
                      <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-orange-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeUser.canOverrideSystemLimits}
                          onChange={(e) =>
                            setEditedUser({
                              ...activeUser,
                              canOverrideSystemLimits: e.target.checked,
                            })
                          }
                          disabled={!isEditing}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-orange-900 flex items-center gap-2">
                            <Key className="size-4" />
                            Can Override System Discount Limits
                          </div>
                          <p className="text-xs text-orange-700 mt-1">
                            User can bypass system-wide discount restrictions. Only grant to trusted senior
                            staff.
                          </p>
                        </div>
                      </label>
                      <div className="bg-white rounded p-3 border border-orange-200">
                        <p className="text-xs text-orange-800">
                          <strong>Current Settings:</strong> User can apply up to{' '}
                          <strong>{activeUser.maxDiscountPercentage}%</strong> discount.{' '}
                          {activeUser.requiresApprovalAbove > 0 &&
                            `Discounts above ${activeUser.requiresApprovalAbove}% require manager approval. `}
                          {activeUser.canOverrideSystemLimits && (
                            <span className="text-red-600 font-bold">
                              ⚠️ Can override all system limits.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="border-2 border-red-200 rounded-lg p-5 bg-red-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-red-300">
                      <Lock className="size-5 text-red-600" />
                      Security Settings
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeUser.mustChangePassword}
                          onChange={(e) =>
                            setEditedUser({
                              ...activeUser,
                              mustChangePassword: e.target.checked,
                            })
                          }
                          disabled={!isEditing}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-red-900">
                            Must Change Password on Next Login
                          </div>
                          <p className="text-xs text-red-700 mt-1">
                            User will be forced to set a new password when they log in
                          </p>
                        </div>
                      </label>
                      <div className="bg-white rounded p-3 border border-red-200">
                        <div className="flex items-start gap-2">
                          <Shield className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-red-800">
                            <p className="font-semibold mb-1">Account Status:</p>
                            <ul className="space-y-1 list-disc list-inside">
                              <li>
                                <strong>Active:</strong>{' '}
                                {activeUser.isActive ? 'Yes - Can log in' : 'No - Cannot log in'}
                              </li>
                              <li>
                                <strong>Locked:</strong>{' '}
                                {activeUser.isLocked
                                  ? 'Yes - Account locked (requires admin unlock)'
                                  : 'No - Account operational'}
                              </li>
                              <li>
                                <strong>Password Change Required:</strong>{' '}
                                {activeUser.mustChangePassword ? 'Yes' : 'No'}
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50">
                    <h3 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2 pb-2 border-b border-gray-300">
                      <Settings className="size-5 text-gray-600" />
                      Additional Notes
                    </h3>
                    <Textarea
                      value={activeUser.notes || ''}
                      onChange={(e) => setEditedUser({ ...activeUser, notes: e.target.value })}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Internal notes about user role, responsibilities, special access requirements, etc."
                      className={!isEditing ? 'bg-gray-50' : 'bg-white'}
                    />
                  </div>

                  {/* Audit Information */}
                  {!isCreating && (
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 border-2 border-gray-400">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <Shield className="size-4" />
                        Security Audit Trail
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Account Status:</span>
                          <div className="mt-1 space-y-1">
                            <div
                              className={`px-3 py-1 rounded text-xs font-bold w-fit ${
                                activeUser.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {activeUser.isActive ? '● ACTIVE' : '○ INACTIVE'}
                            </div>
                            {activeUser.isLocked && (
                              <div className="px-3 py-1 rounded text-xs font-bold w-fit bg-red-100 text-red-700">
                                🔒 LOCKED
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Access Level:</span>
                          <div className="font-bold text-gray-900 mt-1">
                            {getRoleName(activeUser.role)}
                          </div>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Created:</span>
                          <div className="font-semibold text-gray-900 mt-1">
                            {activeUser.createdAt.toLocaleDateString()} by {activeUser.createdBy}
                          </div>
                        </div>
                        {activeUser.updatedAt && (
                          <div className="bg-white rounded p-3 border border-gray-300">
                            <span className="text-gray-500 text-xs">Last Updated:</span>
                            <div className="font-semibold text-gray-900 mt-1">
                              {activeUser.updatedAt.toLocaleDateString()} by {activeUser.updatedBy}
                            </div>
                          </div>
                        )}
                        {activeUser.lastLoginAt && (
                          <div className="bg-white rounded p-3 border border-gray-300">
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                              <Clock className="size-3" />
                              Last Login:
                            </span>
                            <div className="font-semibold text-gray-900 mt-1">
                              {activeUser.lastLoginAt.toLocaleDateString()}{' '}
                              {activeUser.lastLoginAt.toLocaleTimeString()}
                            </div>
                            {activeUser.lastLoginIP && (
                              <div className="text-xs text-gray-600 mt-1">
                                IP: {activeUser.lastLoginIP}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Venue Access:</span>
                          <div className="font-semibold text-gray-900 mt-1">
                            {activeUser.accessAllVenues
                              ? 'All Venues'
                              : `${activeUser.venueAccess.length} Specific`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}