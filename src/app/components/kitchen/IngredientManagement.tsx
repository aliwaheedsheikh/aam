import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Building2,
  Package,
  Calendar,
} from 'lucide-react';

// Types
type UnitOfMeasure = 'kg' | 'liter' | 'piece' | 'dozen' | 'gram' | 'ml';

type Vendor = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  rating: number;
  category: string; // Meat, Vegetables, Spices, Dairy, etc.
};

type Ingredient = {
  id: string;
  name: string;
  nameUrdu?: string;
  category: string; // Meat, Vegetables, Spices, Dairy, etc.
  unit: UnitOfMeasure;
  currentPrice: number; // Per unit in PKR
  lastPrice: number; // Previous price for comparison
  preferredVendorId: string;
  minimumStock: number;
  currentStock: number;
  shelfLife: number; // in days
  lastUpdated: string;
};

type PurchaseHistory = {
  id: string;
  ingredientId: string;
  vendorId: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  purchaseDate: string;
  expiryDate?: string;
};

export function IngredientManagement() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'vendors' | 'purchase-history'>('ingredients');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);

  // Mock data
  const vendors: Vendor[] = [
    {
      id: 'v1',
      name: 'Metro Cash & Carry',
      contactPerson: 'Ahmed Khan',
      phone: '+92 300 1234567',
      email: 'ahmed@metro.pk',
      address: 'Main Boulevard, Gulberg, Lahore',
      rating: 4.5,
      category: 'General Wholesale',
    },
    {
      id: 'v2',
      name: 'Al-Karam Meat Shop',
      contactPerson: 'Mahmood Ali',
      phone: '+92 321 9876543',
      email: 'info@alkarammeat.pk',
      address: 'Food Street, Model Town',
      rating: 4.8,
      category: 'Meat & Poultry',
    },
    {
      id: 'v3',
      name: 'Fresh Vegetables Market',
      contactPerson: 'Rashid Ahmed',
      phone: '+92 333 4567890',
      email: 'rashid@freshveggies.pk',
      address: 'Sabzi Mandi, Badami Bagh',
      rating: 4.2,
      category: 'Vegetables & Fruits',
    },
    {
      id: 'v4',
      name: 'Spice King Traders',
      contactPerson: 'Aslam Masih',
      phone: '+92 300 7654321',
      email: 'spiceking@traders.pk',
      address: 'Anarkali Bazaar, Lahore',
      rating: 4.6,
      category: 'Spices & Condiments',
    },
  ];

  const ingredients: Ingredient[] = [
    // Meat
    {
      id: 'ing1',
      name: 'Chicken Boneless',
      nameUrdu: 'بے ہڈی چکن',
      category: 'Meat & Poultry',
      unit: 'kg',
      currentPrice: 850,
      lastPrice: 820,
      preferredVendorId: 'v2',
      minimumStock: 50,
      currentStock: 120,
      shelfLife: 2,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing2',
      name: 'Chicken With Bone',
      nameUrdu: 'ہڈی والا چکن',
      category: 'Meat & Poultry',
      unit: 'kg',
      currentPrice: 520,
      lastPrice: 500,
      preferredVendorId: 'v2',
      minimumStock: 80,
      currentStock: 200,
      shelfLife: 2,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing3',
      name: 'Beef (Boneless)',
      nameUrdu: 'گائے کا گوشت',
      category: 'Meat & Poultry',
      unit: 'kg',
      currentPrice: 1200,
      lastPrice: 1150,
      preferredVendorId: 'v2',
      minimumStock: 40,
      currentStock: 85,
      shelfLife: 3,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing4',
      name: 'Mutton',
      nameUrdu: 'بکرے کا گوشت',
      category: 'Meat & Poultry',
      unit: 'kg',
      currentPrice: 2200,
      lastPrice: 2100,
      preferredVendorId: 'v2',
      minimumStock: 30,
      currentStock: 60,
      shelfLife: 3,
      lastUpdated: '2026-01-01',
    },
    // Vegetables
    {
      id: 'ing5',
      name: 'Onions',
      nameUrdu: 'پیاز',
      category: 'Vegetables',
      unit: 'kg',
      currentPrice: 120,
      lastPrice: 140,
      preferredVendorId: 'v3',
      minimumStock: 100,
      currentStock: 250,
      shelfLife: 30,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing6',
      name: 'Tomatoes',
      nameUrdu: 'ٹماٹر',
      category: 'Vegetables',
      unit: 'kg',
      currentPrice: 180,
      lastPrice: 160,
      preferredVendorId: 'v3',
      minimumStock: 80,
      currentStock: 180,
      shelfLife: 7,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing7',
      name: 'Green Chilies',
      nameUrdu: 'ہری مرچ',
      category: 'Vegetables',
      unit: 'kg',
      currentPrice: 250,
      lastPrice: 230,
      preferredVendorId: 'v3',
      minimumStock: 20,
      currentStock: 45,
      shelfLife: 5,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing8',
      name: 'Ginger',
      nameUrdu: 'ادرک',
      category: 'Vegetables',
      unit: 'kg',
      currentPrice: 400,
      lastPrice: 380,
      preferredVendorId: 'v3',
      minimumStock: 15,
      currentStock: 30,
      shelfLife: 14,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing9',
      name: 'Garlic',
      nameUrdu: 'لہسن',
      category: 'Vegetables',
      unit: 'kg',
      currentPrice: 450,
      lastPrice: 420,
      preferredVendorId: 'v3',
      minimumStock: 15,
      currentStock: 35,
      shelfLife: 30,
      lastUpdated: '2026-01-01',
    },
    // Spices
    {
      id: 'ing10',
      name: 'Red Chili Powder',
      nameUrdu: 'لال مرچ پاؤڈر',
      category: 'Spices',
      unit: 'kg',
      currentPrice: 800,
      lastPrice: 750,
      preferredVendorId: 'v4',
      minimumStock: 10,
      currentStock: 25,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing11',
      name: 'Turmeric Powder',
      nameUrdu: 'ہلدی پاؤڈر',
      category: 'Spices',
      unit: 'kg',
      currentPrice: 600,
      lastPrice: 580,
      preferredVendorId: 'v4',
      minimumStock: 8,
      currentStock: 18,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing12',
      name: 'Cumin Seeds',
      nameUrdu: 'زیرہ',
      category: 'Spices',
      unit: 'kg',
      currentPrice: 900,
      lastPrice: 850,
      preferredVendorId: 'v4',
      minimumStock: 5,
      currentStock: 12,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing13',
      name: 'Coriander Powder',
      nameUrdu: 'دھنیا پاؤڈر',
      category: 'Spices',
      unit: 'kg',
      currentPrice: 550,
      lastPrice: 520,
      preferredVendorId: 'v4',
      minimumStock: 8,
      currentStock: 15,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing14',
      name: 'Garam Masala',
      nameUrdu: 'گرم مسالہ',
      category: 'Spices',
      unit: 'kg',
      currentPrice: 1200,
      lastPrice: 1150,
      preferredVendorId: 'v4',
      minimumStock: 5,
      currentStock: 10,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    // Dairy
    {
      id: 'ing15',
      name: 'Yogurt',
      nameUrdu: 'دہی',
      category: 'Dairy',
      unit: 'kg',
      currentPrice: 200,
      lastPrice: 190,
      preferredVendorId: 'v1',
      minimumStock: 40,
      currentStock: 100,
      shelfLife: 3,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing16',
      name: 'Fresh Cream',
      nameUrdu: 'ملائی',
      category: 'Dairy',
      unit: 'liter',
      currentPrice: 650,
      lastPrice: 620,
      preferredVendorId: 'v1',
      minimumStock: 20,
      currentStock: 45,
      shelfLife: 5,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing17',
      name: 'Butter',
      nameUrdu: 'مکھن',
      category: 'Dairy',
      unit: 'kg',
      currentPrice: 1100,
      lastPrice: 1080,
      preferredVendorId: 'v1',
      minimumStock: 15,
      currentStock: 30,
      shelfLife: 30,
      lastUpdated: '2026-01-01',
    },
    // Rice
    {
      id: 'ing18',
      name: 'Basmati Rice (Premium)',
      nameUrdu: 'باسمتی چاول',
      category: 'Grains',
      unit: 'kg',
      currentPrice: 320,
      lastPrice: 300,
      preferredVendorId: 'v1',
      minimumStock: 200,
      currentStock: 500,
      shelfLife: 365,
      lastUpdated: '2026-01-01',
    },
    // Oil
    {
      id: 'ing19',
      name: 'Cooking Oil',
      nameUrdu: 'کھانا پکانے کا تیل',
      category: 'Oil & Ghee',
      unit: 'liter',
      currentPrice: 580,
      lastPrice: 560,
      preferredVendorId: 'v1',
      minimumStock: 80,
      currentStock: 150,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
    {
      id: 'ing20',
      name: 'Ghee (Pure)',
      nameUrdu: 'خالص گھی',
      category: 'Oil & Ghee',
      unit: 'kg',
      currentPrice: 1800,
      lastPrice: 1750,
      preferredVendorId: 'v1',
      minimumStock: 30,
      currentStock: 65,
      shelfLife: 180,
      lastUpdated: '2026-01-01',
    },
  ];

  const categories = [
    'Meat & Poultry',
    'Vegetables',
    'Spices',
    'Dairy',
    'Grains',
    'Oil & Ghee',
  ];

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ing.nameUrdu?.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getVendorName = (vendorId: string) => {
    return vendors.find(v => v.id === vendorId)?.name || 'Unknown';
  };

  const getPriceChange = (current: number, last: number) => {
    const change = ((current - last) / last) * 100;
    return change.toFixed(1);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="size-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ingredient & Vendor Management</h1>
              <p className="text-sm text-gray-500">Manage ingredients, vendors, and purchase history</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowVendorDialog(true)}
              variant="outline"
            >
              <Building2 className="size-4 mr-2" />
              Add Vendor
            </Button>
            <Button
              onClick={() => setShowIngredientDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="size-4 mr-2" />
              Add Ingredient
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'ingredients'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredients ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'vendors'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('purchase-history')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'purchase-history'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Purchase History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ingredients' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="bg-white border-b px-6 py-4 flex-shrink-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search ingredients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Change</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredIngredients.map(ing => {
                      const priceChange = parseFloat(getPriceChange(ing.currentPrice, ing.lastPrice));
                      const stockStatus = ing.currentStock <= ing.minimumStock ? 'low' : 'ok';
                      
                      return (
                        <tr key={ing.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{ing.name}</div>
                              {ing.nameUrdu && (
                                <div className="text-sm text-gray-500">{ing.nameUrdu}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {ing.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">PKR {ing.currentPrice.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">per {ing.unit}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1 ${
                              priceChange > 0 ? 'text-red-600' : priceChange < 0 ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {priceChange > 0 ? (
                                <TrendingUp className="size-4" />
                              ) : priceChange < 0 ? (
                                <TrendingDown className="size-4" />
                              ) : null}
                              <span className="text-sm font-medium">
                                {priceChange > 0 ? '+' : ''}{priceChange}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${stockStatus === 'low' ? 'text-red-600' : 'text-gray-900'}`}>
                              {ing.currentStock} {ing.unit}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {ing.minimumStock} {ing.unit}
                            </div>
                            {stockStatus === 'low' && (
                              <span className="text-xs text-red-600 font-medium">Low Stock!</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {getVendorName(ing.preferredVendorId)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button className="p-1 hover:bg-blue-50 rounded text-blue-600">
                                <Edit className="size-4" />
                              </button>
                              <button className="p-1 hover:bg-red-50 rounded text-red-600">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map(vendor => (
                <div key={vendor.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded inline-block mt-1">
                        {vendor.category}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                        <Edit className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-red-50 rounded text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="size-4" />
                      <span>{vendor.contactPerson}</span>
                    </div>
                    <div className="text-gray-600">{vendor.phone}</div>
                    <div className="text-gray-600">{vendor.email}</div>
                    <div className="text-gray-500 text-xs">{vendor.address}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">Rating: </span>
                      <span className="font-medium text-yellow-600">⭐ {vendor.rating}/5</span>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'purchase-history' && (
          <div className="p-6">
            <div className="bg-white rounded-lg border p-6 text-center">
              <Calendar className="size-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Purchase history will be shown here</p>
              <p className="text-sm text-gray-400 mt-2">Track all ingredient purchases and price changes over time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
