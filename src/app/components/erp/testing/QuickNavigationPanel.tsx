import { useState } from 'react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import {
  Navigation,
  Building2,
  Calendar,
  Users,
  Settings,
  DollarSign,
  ChefHat,
  ShoppingCart,
  LayoutDashboard,
  MapPin,
  Layers,
  Grid3x3,
  PartyPopper,
  Clock,
  Package,
  Gift,
  Percent,
  FileText,
  CreditCard,
  Shield,
  Wrench,
} from 'lucide-react';
import { Badge } from '../../ui/badge';

interface QuickNavigationPanelProps {
  onNavigate: (section: string) => void;
  currentSection?: string;
}

const navigationItems = [
  // Core Modules
  {
    category: 'Core Operations',
    items: [
      { id: 'front-office', label: 'Front Office Dashboard', icon: LayoutDashboard, color: 'blue', description: 'Main operational dashboard' },
      { id: 'event-calendar', label: 'Inquiry Follow-ups', icon: Calendar, color: 'green', description: 'View and manage inquiry callbacks' },
    ],
  },
  // Master Setup
  {
    category: 'Master Setup (Admin Only)',
    items: [
      { id: 'venue-master', label: 'Venue Master', icon: Building2, color: 'purple', description: 'Manage venues and properties' },
      { id: 'prime-space', label: 'Prime Space Setup', icon: MapPin, color: 'purple', description: 'Configure halls, marquees, lawns' },
      { id: 'sub-space', label: 'Sub Space Setup', icon: Layers, color: 'purple', description: 'Define divisible sections' },
      { id: 'layout-master', label: 'Layout Master', icon: Grid3x3, color: 'purple', description: 'Seating arrangements' },
    ],
  },
  // Event Configuration
  {
    category: 'Event Configuration',
    items: [
      { id: 'event-types', label: 'Event Types', icon: PartyPopper, color: 'pink', description: 'Wedding, Corporate, etc.' },
      { id: 'time-slots', label: 'Time Slots', icon: Clock, color: 'pink', description: 'Morning, Lunch, Dinner' },
      { id: 'services', label: 'Services Setup', icon: Package, color: 'pink', description: 'Additional services' },
      { id: 'packages', label: 'Packages', icon: Gift, color: 'pink', description: 'Event packages' },
    ],
  },
  // Financial Configuration
  {
    category: 'Financial Configuration',
    items: [
      { id: 'advance-rules', label: 'Advance Rules', icon: CreditCard, color: 'green', description: 'Payment policies' },
      { id: 'tax-groups', label: 'Tax Groups', icon: Percent, color: 'green', description: 'Tax configuration' },
      { id: 'ledger-groups', label: 'Ledger Groups', icon: FileText, color: 'green', description: 'Accounting setup' },
    ],
  },
  // User Management
  {
    category: 'User & Security',
    items: [
      { id: 'user-roles', label: 'User & Role Setup', icon: Users, color: 'orange', description: 'Manage users and permissions' },
      { id: 'security', label: 'Security Settings', icon: Shield, color: 'orange', description: 'Access control' },
      { id: 'system-defaults', label: 'System Defaults', icon: Wrench, color: 'orange', description: 'Global configurations' },
    ],
  },
  // Kitchen & Vendor
  {
    category: 'Operations',
    items: [
      { id: 'banquet-kitchen', label: 'Banquet Kitchen', icon: ChefHat, color: 'red', description: 'Kitchen management' },
      { id: 'vendor-management', label: 'Vendor Management', icon: ShoppingCart, color: 'blue', description: 'Supplier tracking' },
    ],
  },
];

export function QuickNavigationPanel({ onNavigate, currentSection }: QuickNavigationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsOpen(false);
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      pink: 'text-pink-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
    };
    return colors[color] || 'text-gray-600';
  };

  const getBgColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      green: 'bg-green-50 hover:bg-green-100 border-green-200',
      purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      pink: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
      orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      red: 'bg-red-50 hover:bg-red-100 border-red-200',
    };
    return colors[color] || 'bg-gray-50 hover:bg-gray-100 border-gray-200';
  };

  // Filter items based on search
  const filteredCategories = navigationItems.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.items.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-40 z-50 shadow-lg bg-blue-600 text-white hover:bg-blue-700 border-blue-700"
        >
          <Navigation className="size-4 mr-2" />
          Quick Nav
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="size-5 text-blue-600" />
            Quick Navigation
          </DialogTitle>
          <DialogDescription>
            Jump to any module or configuration screen
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No modules found matching "{searchQuery}"
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.category}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {category.category}
                  <Badge variant="outline" className="text-xs">
                    {category.items.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`
                          relative p-4 border rounded-lg text-left transition-all
                          ${isActive 
                            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' 
                            : getBgColor(item.color)
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`size-5 ${getIconColor(item.color)} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                              {item.label}
                              {isActive && (
                                <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Use the search bar above to quickly find modules
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
