import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Utensils,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ChefHat,
  Salad,
  IceCream,
  X,
} from 'lucide-react';
import { formatCurrencyPKR } from '../../lib/locale';

interface MenuItem {
  id: string;
  name: string;
  category: 'main' | 'bread' | 'rice' | 'salad' | 'raita' | 'sweet' | 'beverage' | 'custom';
  ratePerHead: number;
}

interface PredefinedMenu {
  id: string;
  name: string;
  description: string;
  totalRate: number;
  items: MenuItem[];
}

// Predefined Menu Templates
const predefinedMenus: PredefinedMenu[] = [
  {
    id: 'economy',
    name: 'Economy Menu',
    description: 'Budget-friendly classic menu',
    totalRate: 2500,
    items: [
      { id: 'm1', name: 'Chicken Biryani', category: 'rice', ratePerHead: 800 },
      { id: 'm2', name: 'Chicken Qorma', category: 'main', ratePerHead: 600 },
      { id: 'm3', name: 'Plain Naan', category: 'bread', ratePerHead: 100 },
      { id: 'm4', name: 'Raita', category: 'raita', ratePerHead: 150 },
      { id: 'm5', name: 'Fresh Salad', category: 'salad', ratePerHead: 200 },
      { id: 'm6', name: 'Gulab Jamun', category: 'sweet', ratePerHead: 250 },
      { id: 'm7', name: 'Cold Drink', category: 'beverage', ratePerHead: 200 },
      { id: 'm8', name: 'Mineral Water', category: 'beverage', ratePerHead: 200 },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Menu',
    description: 'Premium quality with variety',
    totalRate: 3500,
    items: [
      { id: 'm1', name: 'Mutton Qorma', category: 'main', ratePerHead: 900 },
      { id: 'm2', name: 'Chicken Biryani', category: 'rice', ratePerHead: 800 },
      { id: 'm3', name: 'Qandari Naan', category: 'bread', ratePerHead: 150 },
      { id: 'm4', name: 'Raita', category: 'raita', ratePerHead: 150 },
      { id: 'm5', name: 'Fresh Salad', category: 'salad', ratePerHead: 200 },
      { id: 'm6', name: 'Kulfa', category: 'sweet', ratePerHead: 350 },
      { id: 'm7', name: 'Cold Drink', category: 'beverage', ratePerHead: 200 },
      { id: 'm8', name: 'Mineral Water', category: 'beverage', ratePerHead: 200 },
      { id: 'm9', name: 'Fresh Juice', category: 'beverage', ratePerHead: 300 },
      { id: 'm10', name: 'Chicken Tikka', category: 'main', ratePerHead: 250 },
    ],
  },
  {
    id: 'deluxe',
    name: 'Deluxe Menu',
    description: 'Deluxe wedding package',
    totalRate: 4500,
    items: [
      { id: 'm1', name: 'Mutton Qorma', category: 'main', ratePerHead: 900 },
      { id: 'm2', name: 'Mutton Biryani', category: 'rice', ratePerHead: 1000 },
      { id: 'm3', name: 'Beef Pulao', category: 'rice', ratePerHead: 700 },
      { id: 'm4', name: 'Qandari Naan', category: 'bread', ratePerHead: 150 },
      { id: 'm5', name: 'Sheermal', category: 'bread', ratePerHead: 100 },
      { id: 'm6', name: 'Raita', category: 'raita', ratePerHead: 150 },
      { id: 'm7', name: 'Russian Salad', category: 'salad', ratePerHead: 250 },
      { id: 'm8', name: 'Kulfa', category: 'sweet', ratePerHead: 350 },
      { id: 'm9', name: 'Gulab Jamun', category: 'sweet', ratePerHead: 250 },
      { id: 'm10', name: 'Cold Drink', category: 'beverage', ratePerHead: 200 },
      { id: 'm11', name: 'Mineral Water', category: 'beverage', ratePerHead: 200 },
      { id: 'm12', name: 'Fresh Juice', category: 'beverage', ratePerHead: 300 },
    ],
  },
];

// Available items for swapping/adding
const availableItems = {
  salad: [
    { id: 's1', name: 'Fresh Salad', ratePerHead: 200 },
    { id: 's2', name: 'Russian Salad', ratePerHead: 250 },
    { id: 's3', name: 'Pasta Salad', ratePerHead: 280 },
    { id: 's4', name: 'Fruit Salad', ratePerHead: 300 },
    { id: 's5', name: 'Greek Salad', ratePerHead: 350 },
  ],
  sweet: [
    { id: 'sw1', name: 'Gulab Jamun', ratePerHead: 250 },
    { id: 'sw2', name: 'Kulfa', ratePerHead: 350 },
    { id: 'sw3', name: 'Kheer', ratePerHead: 300 },
    { id: 'sw4', name: 'Zarda', ratePerHead: 280 },
    { id: 'sw5', name: 'Ras Malai', ratePerHead: 400 },
    { id: 'sw6', name: 'Gajar Halwa', ratePerHead: 320 },
    { id: 'sw7', name: 'Lab-e-Shireen', ratePerHead: 350 },
  ],
  main: [
    { id: 'mn1', name: 'Mutton Qorma', ratePerHead: 900 },
    { id: 'mn2', name: 'Chicken Qorma', ratePerHead: 600 },
    { id: 'mn3', name: 'Chicken Tikka', ratePerHead: 250 },
    { id: 'mn4', name: 'Mutton Karahi', ratePerHead: 950 },
    { id: 'mn5', name: 'Chicken Karahi', ratePerHead: 650 },
    { id: 'mn6', name: 'Seekh Kabab', ratePerHead: 400 },
  ],
  rice: [
    { id: 'r1', name: 'Chicken Biryani', ratePerHead: 800 },
    { id: 'r2', name: 'Mutton Biryani', ratePerHead: 1000 },
    { id: 'r3', name: 'Beef Pulao', ratePerHead: 700 },
    { id: 'r4', name: 'Plain Rice', ratePerHead: 300 },
  ],
  bread: [
    { id: 'b1', name: 'Plain Naan', ratePerHead: 100 },
    { id: 'b2', name: 'Qandari Naan', ratePerHead: 150 },
    { id: 'b3', name: 'Sheermal', ratePerHead: 100 },
    { id: 'b4', name: 'Roghni Naan', ratePerHead: 120 },
  ],
};

interface MenuSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (selectedItems: MenuItem[], totalRate: number) => void;
  currentItems?: MenuItem[];
  currentRate?: number;
}

export function MenuSelectionDialog({
  open,
  onClose,
  onSave,
  currentItems = [],
  currentRate = 0,
}: MenuSelectionDialogProps) {
  const [selectedPredefinedMenu, setSelectedPredefinedMenu] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(
    currentItems.length > 0 ? currentItems : []
  );

  const handleSelectPredefinedMenu = (menuId: string) => {
    const menu = predefinedMenus.find((m) => m.id === menuId);
    if (menu) {
      setMenuItems([...menu.items]);
      setSelectedPredefinedMenu(menuId);
    }
  };

  const handleSwapItem = (oldItemId: string, category: 'salad' | 'sweet', newItemName: string, newRate: number) => {
    const newItems = menuItems.map((item) =>
      item.id === oldItemId
        ? { ...item, name: newItemName, ratePerHead: newRate }
        : item
    );
    setMenuItems(newItems);
  };

  const handleRemoveItem = (itemId: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== itemId));
  };

  const handleAddCustomItem = () => {
    const newItem: MenuItem = {
      id: `custom-${Date.now()}`,
      name: '',
      category: 'custom',
      ratePerHead: 0,
    };
    setMenuItems([...menuItems, newItem]);
  };

  const handleUpdateCustomItem = (
    itemId: string,
    field: 'name' | 'ratePerHead' | 'category',
    value: string | number
  ) => {
    const newItems = menuItems.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    setMenuItems(newItems);
  };

  const totalRate = menuItems.reduce((sum, item) => sum + item.ratePerHead, 0);

  const handleSave = () => {
    onSave(menuItems, totalRate);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'salad':
        return <Salad className="size-4 text-green-600" />;
      case 'sweet':
        return <IceCream className="size-4 text-pink-600" />;
      case 'main':
        return <Utensils className="size-4 text-orange-600" />;
      case 'rice':
        return <ChefHat className="size-4 text-amber-600" />;
      default:
        return <Utensils className="size-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ChefHat className="size-6 text-orange-600" />
            Menu Selection & Customization
          </DialogTitle>
          <DialogDescription>
            Select a predefined menu or customize your menu by swapping items and adding dishes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Predefined Menu Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Predefined Menu</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMenuItems([]);
                  setSelectedPredefinedMenu('');
                  handleAddCustomItem();
                }}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="size-4 mr-2" />
                Create Custom Menu from Scratch
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {predefinedMenus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => handleSelectPredefinedMenu(menu.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPredefinedMenu === menu.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{menu.name}</h4>
                    {selectedPredefinedMenu === menu.id && (
                      <Check className="size-5 text-orange-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
                  <div className="text-xs text-orange-600 font-semibold">
                    {formatCurrencyPKR(menu.totalRate)} per head
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{menu.items.length} items</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Menu Items */}
          {menuItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Menu Items</Label>
                <div className="text-sm text-orange-600 font-semibold">
                  Total Rate: {formatCurrencyPKR(totalRate)} per head
                </div>
              </div>

              <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50/30">
                <div className="space-y-2">
                  {menuItems.map((item, index) => {
                    const isHighlighted = item.category === 'salad' || item.category === 'sweet';
                    const isCustom = item.category === 'custom';

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg border ${
                          isHighlighted
                            ? item.category === 'salad'
                              ? 'bg-green-50 border-green-300 border-2'
                              : 'bg-pink-50 border-pink-300 border-2'
                            : isCustom
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(item.category)}
                            <span className="text-sm font-semibold text-gray-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-3">
                          {isCustom ? (
                            <Input
                              placeholder="Enter dish name"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateCustomItem(item.id, 'name', e.target.value)
                              }
                              className="h-9"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {isHighlighted && (
                                <span className="text-xs px-2 py-0.5 rounded bg-white border">
                                  {item.category === 'salad' ? '🥗 Salad' : '🍨 Sweet'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          {isCustom ? (
                            <Select
                              value={item.category}
                              onValueChange={(value) =>
                                handleUpdateCustomItem(item.id, 'category', value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="main">Main Dish</SelectItem>
                                <SelectItem value="rice">Rice</SelectItem>
                                <SelectItem value="bread">Bread</SelectItem>
                                <SelectItem value="salad">Salad</SelectItem>
                                <SelectItem value="raita">Raita</SelectItem>
                                <SelectItem value="sweet">Sweet</SelectItem>
                                <SelectItem value="beverage">Beverage</SelectItem>
                                <SelectItem value="custom">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-gray-500 capitalize">
                              {item.category}
                            </span>
                          )}
                        </div>

                        <div className="col-span-2">
                          {isCustom ? (
                            <Input
                              type="number"
                              placeholder="Rate"
                              value={item.ratePerHead || ''}
                              onChange={(e) =>
                                handleUpdateCustomItem(
                                  item.id,
                                  'ratePerHead',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-orange-600">
                              {formatCurrencyPKR(item.ratePerHead)}
                            </span>
                          )}
                        </div>

                        <div className="col-span-3">
                          {isHighlighted && !isCustom && (
                            <Select
                              value={item.name}
                              onValueChange={(value) => {
                                const category = item.category as 'salad' | 'sweet';
                                const selectedItem = availableItems[category].find(
                                  (i) => i.name === value
                                );
                                if (selectedItem) {
                                  handleSwapItem(
                                    item.id,
                                    category,
                                    selectedItem.name,
                                    selectedItem.ratePerHead
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Swap item" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableItems[item.category as 'salad' | 'sweet'].map(
                                  (availItem) => (
                                    <SelectItem key={availItem.id} value={availItem.name}>
                                      <div className="flex items-center justify-between gap-3">
                                        <span>{availItem.name}</span>
                                        <span className="text-xs text-orange-600">
                                          {formatCurrencyPKR(availItem.ratePerHead)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Item Button */}
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomItem}
                    className="w-full border-dashed border-2 border-orange-300 hover:bg-orange-50"
                  >
                    <Plus className="size-4 mr-2" />
                    Add Custom Dish
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-sm p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
                  <span className="text-gray-700">Salad (Swappable)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-pink-100 border-2 border-pink-300"></div>
                  <span className="text-gray-700">Sweet (Swappable)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                  <span className="text-gray-700">Custom Added</span>
                </div>
              </div>
            </div>
          )}

          {menuItems.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <ChefHat className="size-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Select a predefined menu to get started</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={menuItems.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Check className="size-4 mr-2" />
            Save Menu Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

