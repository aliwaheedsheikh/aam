import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  ChefHat,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  DollarSign,
  Clock,
  Users,
  Flame,
  BookOpen,
  Menu as MenuIcon,
  ChevronRight,
  Star,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { IngredientManagement } from './IngredientManagement';
import { ProductionPlanning } from './ProductionPlanning';
import { Booking } from '../calendar/types-v2';

// Types
type Cuisine = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

type Category = {
  id: string;
  cuisineId: string;
  name: string;
  description: string;
  preparationStation: string; // BBQ, Tandoor, Curry Station, etc.
};

type Dish = {
  id: string;
  cuisineId: string;
  categoryId: string;
  name: string;
  nameUrdu?: string;
  description: string;
  ingredients: string[];
  preparationSteps: string[];
  cookingTime: number; // in minutes
  servingSize: number; // serves how many people
  costPerServing: number; // in PKR
  sellingPrice: number; // in PKR
  spiceLevel: 'mild' | 'medium' | 'hot' | 'very-hot';
  dietaryInfo: string[]; // halal, vegetarian, gluten-free, etc.
  isPopular: boolean;
  isSignature: boolean;
};

type MenuTemplate = {
  id: string;
  name: string;
  description: string;
  tier: 'economy' | 'silver' | 'gold' | 'platinum';
  pricePerHead: number;
  dishes: string[]; // dish IDs
  beverages: string[];
  desserts: string[];
  minGuests: number;
};

export function KitchenManagementSystem() {
  const [activeTab, setActiveTab] = useState<'cuisines' | 'categories' | 'dishes' | 'menus'>('dishes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Dialog states
  const [showDishDialog, setShowDishDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editingMenu, setEditingMenu] = useState<MenuTemplate | null>(null);

  // Mock data - In production, this would come from database
  const cuisines: Cuisine[] = [
    { id: '1', name: 'Pakistani', description: 'Traditional Pakistani cuisine', icon: '🇵🇰' },
    { id: '2', name: 'Chinese', description: 'Chinese fusion dishes', icon: '🇨🇳' },
    { id: '3', name: 'Thai', description: 'Authentic Thai cuisine', icon: '🇹🇭' },
    { id: '4', name: 'Continental', description: 'Western dishes', icon: '🍽️' },
  ];

  const categories: Category[] = [
    // Pakistani
    { id: '1', cuisineId: '1', name: 'BBQ Items', description: 'Grilled meats and kebabs', preparationStation: 'BBQ Station' },
    { id: '2', cuisineId: '1', name: 'Tandoor Items', description: 'Clay oven specialties', preparationStation: 'Tandoor Station' },
    { id: '3', cuisineId: '1', name: 'Curries & Handis', description: 'Traditional curries', preparationStation: 'Curry Station' },
    { id: '4', cuisineId: '1', name: 'Rice Dishes', description: 'Biryani and pulao varieties', preparationStation: 'Rice Station' },
    { id: '5', cuisineId: '1', name: 'Breads', description: 'Naan, roti, paratha', preparationStation: 'Tandoor Station' },
    // Chinese
    { id: '6', cuisineId: '2', name: 'Stir Fry', description: 'Wok-fried dishes', preparationStation: 'Wok Station' },
    { id: '7', cuisineId: '2', name: 'Soups', description: 'Hot and sour varieties', preparationStation: 'Soup Station' },
    { id: '8', cuisineId: '2', name: 'Fried Rice & Noodles', description: 'Rice and noodle dishes', preparationStation: 'Wok Station' },
    // Thai
    { id: '9', cuisineId: '3', name: 'Curries', description: 'Thai curry varieties', preparationStation: 'Thai Station' },
    { id: '10', cuisineId: '3', name: 'Stir Fry', description: 'Pad Thai and more', preparationStation: 'Wok Station' },
    // Continental
    { id: '11', cuisineId: '4', name: 'Steaks & Grills', description: 'Grilled meats', preparationStation: 'Grill Station' },
    { id: '12', cuisineId: '4', name: 'Pasta', description: 'Italian pasta dishes', preparationStation: 'Pasta Station' },
  ];

  const dishes: Dish[] = [
    // Pakistani BBQ
    {
      id: 'd1',
      cuisineId: '1',
      categoryId: '1',
      name: 'Chicken Tikka',
      nameUrdu: 'چکن ٹکہ',
      description: 'Boneless chicken marinated in yogurt and spices, grilled to perfection',
      ingredients: ['Boneless chicken', 'Yogurt', 'Ginger-garlic paste', 'Red chili', 'Garam masala', 'Lemon juice', 'Oil'],
      preparationSteps: [
        'Cut chicken into 2-inch cubes',
        'Mix yogurt with all spices and marinade',
        'Marinate chicken for 4-6 hours',
        'Skewer and grill on charcoal for 15-20 minutes',
        'Serve hot with mint chutney'
      ],
      cookingTime: 30,
      servingSize: 4,
      costPerServing: 180,
      sellingPrice: 450,
      spiceLevel: 'medium',
      dietaryInfo: ['Halal', 'Gluten-free'],
      isPopular: true,
      isSignature: true,
    },
    {
      id: 'd2',
      cuisineId: '1',
      categoryId: '1',
      name: 'Seekh Kabab',
      nameUrdu: 'سیخ کباب',
      description: 'Minced meat kebabs with aromatic spices grilled on skewers',
      ingredients: ['Minced beef', 'Onion', 'Green chili', 'Coriander', 'Cumin', 'Black pepper', 'Salt'],
      preparationSteps: [
        'Mix all ingredients with minced meat',
        'Rest mixture for 30 minutes',
        'Mold onto skewers',
        'Grill on medium heat for 12-15 minutes',
        'Turn frequently for even cooking'
      ],
      cookingTime: 25,
      servingSize: 4,
      costPerServing: 200,
      sellingPrice: 500,
      spiceLevel: 'medium',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: false,
    },
    {
      id: 'd3',
      cuisineId: '1',
      categoryId: '1',
      name: 'Malai Boti',
      nameUrdu: 'ملائی بوٹی',
      description: 'Creamy chicken pieces marinated in cream and mild spices',
      ingredients: ['Chicken breast', 'Fresh cream', 'Cheese', 'White pepper', 'Cardamom', 'Cashew paste', 'Salt'],
      preparationSteps: [
        'Cube chicken breast',
        'Prepare cream marinade with all ingredients',
        'Marinate for 3-4 hours',
        'Grill on low heat to avoid burning cream',
        'Serve garnished with cream'
      ],
      cookingTime: 25,
      servingSize: 4,
      costPerServing: 220,
      sellingPrice: 550,
      spiceLevel: 'mild',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: true,
    },
    // Pakistani Curries
    {
      id: 'd4',
      cuisineId: '1',
      categoryId: '3',
      name: 'Chicken Karahi',
      nameUrdu: 'چکن کڑاہی',
      description: 'Traditional wok-cooked chicken curry with tomatoes and green chilies',
      ingredients: ['Chicken', 'Tomatoes', 'Green chilies', 'Ginger', 'Garlic', 'Oil', 'Coriander', 'Spices'],
      preparationSteps: [
        'Heat oil in karahi/wok',
        'Cook chicken until golden',
        'Add ginger, garlic, and spices',
        'Add tomatoes and cook until oil separates',
        'Garnish with coriander and green chilies'
      ],
      cookingTime: 45,
      servingSize: 6,
      costPerServing: 150,
      sellingPrice: 400,
      spiceLevel: 'hot',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: true,
    },
    {
      id: 'd5',
      cuisineId: '1',
      categoryId: '3',
      name: 'Mutton Korma',
      nameUrdu: 'مٹن قورمہ',
      description: 'Rich and creamy mutton curry with aromatic spices',
      ingredients: ['Mutton', 'Yogurt', 'Onions', 'Almonds', 'Cream', 'Whole spices', 'Saffron'],
      preparationSteps: [
        'Fry onions until golden brown',
        'Cook mutton with yogurt and spices',
        'Slow cook for 1.5 hours until tender',
        'Add fried onions and cream',
        'Garnish with almonds and saffron'
      ],
      cookingTime: 120,
      servingSize: 6,
      costPerServing: 280,
      sellingPrice: 700,
      spiceLevel: 'medium',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: false,
    },
    // Pakistani Rice
    {
      id: 'd6',
      cuisineId: '1',
      categoryId: '4',
      name: 'Chicken Biryani',
      nameUrdu: 'چکن بریانی',
      description: 'Fragrant basmati rice layered with spiced chicken',
      ingredients: ['Basmati rice', 'Chicken', 'Yogurt', 'Fried onions', 'Saffron', 'Whole spices', 'Mint', 'Coriander'],
      preparationSteps: [
        'Marinate chicken in yogurt and spices',
        'Parboil rice with whole spices',
        'Layer chicken and rice in pot',
        'Add saffron milk and fried onions',
        'Dum cook on low heat for 30 minutes'
      ],
      cookingTime: 90,
      servingSize: 8,
      costPerServing: 160,
      sellingPrice: 450,
      spiceLevel: 'medium',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: true,
    },
    {
      id: 'd7',
      cuisineId: '1',
      categoryId: '4',
      name: 'Vegetable Pulao',
      nameUrdu: 'سبزی پلاؤ',
      description: 'Aromatic rice cooked with mixed vegetables',
      ingredients: ['Basmati rice', 'Mixed vegetables', 'Whole spices', 'Ghee', 'Stock', 'Fried onions'],
      preparationSteps: [
        'Fry whole spices in ghee',
        'Add vegetables and rice',
        'Add stock and bring to boil',
        'Cover and cook on low heat',
        'Garnish with fried onions'
      ],
      cookingTime: 40,
      servingSize: 6,
      costPerServing: 80,
      sellingPrice: 250,
      spiceLevel: 'mild',
      dietaryInfo: ['Halal', 'Vegetarian'],
      isPopular: false,
      isSignature: false,
    },
    // Chinese
    {
      id: 'd8',
      cuisineId: '2',
      categoryId: '6',
      name: 'Chicken Manchurian',
      description: 'Crispy chicken in sweet and spicy sauce',
      ingredients: ['Chicken', 'Cornflour', 'Soy sauce', 'Vinegar', 'Garlic', 'Ginger', 'Bell peppers', 'Spring onions'],
      preparationSteps: [
        'Coat chicken in cornflour and deep fry',
        'Prepare sauce with soy, vinegar, and aromatics',
        'Stir fry vegetables',
        'Toss fried chicken in sauce',
        'Garnish with spring onions'
      ],
      cookingTime: 30,
      servingSize: 4,
      costPerServing: 140,
      sellingPrice: 380,
      spiceLevel: 'medium',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: false,
    },
    {
      id: 'd9',
      cuisineId: '2',
      categoryId: '8',
      name: 'Chicken Fried Rice',
      description: 'Wok-fried rice with chicken and vegetables',
      ingredients: ['Rice', 'Chicken', 'Eggs', 'Vegetables', 'Soy sauce', 'Spring onions', 'Oil'],
      preparationSteps: [
        'Use day-old rice for best results',
        'Scramble eggs and set aside',
        'Stir fry chicken and vegetables',
        'Add rice and sauces',
        'Toss everything together on high heat'
      ],
      cookingTime: 20,
      servingSize: 4,
      costPerServing: 100,
      sellingPrice: 300,
      spiceLevel: 'mild',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: false,
    },
    // Thai
    {
      id: 'd10',
      cuisineId: '3',
      categoryId: '9',
      name: 'Thai Green Curry',
      description: 'Coconut-based green curry with chicken',
      ingredients: ['Chicken', 'Green curry paste', 'Coconut milk', 'Thai basil', 'Bamboo shoots', 'Fish sauce', 'Palm sugar'],
      preparationSteps: [
        'Fry curry paste in oil',
        'Add coconut milk and bring to simmer',
        'Add chicken and vegetables',
        'Season with fish sauce and sugar',
        'Finish with Thai basil'
      ],
      cookingTime: 35,
      servingSize: 4,
      costPerServing: 180,
      sellingPrice: 480,
      spiceLevel: 'hot',
      dietaryInfo: ['Halal'],
      isPopular: false,
      isSignature: false,
    },
    {
      id: 'd11',
      cuisineId: '3',
      categoryId: '10',
      name: 'Pad Thai',
      description: 'Stir-fried rice noodles with chicken',
      ingredients: ['Rice noodles', 'Chicken', 'Eggs', 'Bean sprouts', 'Peanuts', 'Tamarind', 'Fish sauce', 'Palm sugar'],
      preparationSteps: [
        'Soak rice noodles',
        'Stir fry chicken and push to side',
        'Scramble eggs in same pan',
        'Add noodles and sauce',
        'Garnish with peanuts and bean sprouts'
      ],
      cookingTime: 25,
      servingSize: 4,
      costPerServing: 150,
      sellingPrice: 420,
      spiceLevel: 'mild',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: false,
    },
    // Continental
    {
      id: 'd12',
      cuisineId: '4',
      categoryId: '11',
      name: 'Grilled Beef Steak',
      description: 'Tender beef steak grilled to perfection',
      ingredients: ['Beef steak', 'Olive oil', 'Garlic', 'Rosemary', 'Black pepper', 'Salt', 'Butter'],
      preparationSteps: [
        'Bring steak to room temperature',
        'Season with salt and pepper',
        'Sear on high heat 3-4 minutes per side',
        'Finish with butter and herbs',
        'Rest for 5 minutes before serving'
      ],
      cookingTime: 20,
      servingSize: 2,
      costPerServing: 450,
      sellingPrice: 1200,
      spiceLevel: 'mild',
      dietaryInfo: ['Halal'],
      isPopular: true,
      isSignature: true,
    },
  ];

  const menuTemplates: MenuTemplate[] = [
    {
      id: 'm1',
      name: 'Gold Pakistani Package',
      description: 'Premium Pakistani menu for special occasions',
      tier: 'gold',
      pricePerHead: 2500,
      dishes: ['d1', 'd2', 'd3', 'd4', 'd6'],
      beverages: ['Soft drinks', 'Fresh juices', 'Mineral water'],
      desserts: ['Gulab jamun', 'Kheer', 'Fruit trifle'],
      minGuests: 100,
    },
    {
      id: 'm2',
      name: 'Silver Pakistani Package',
      description: 'Quality Pakistani menu at great value',
      tier: 'silver',
      pricePerHead: 1800,
      dishes: ['d1', 'd2', 'd4', 'd6'],
      beverages: ['Soft drinks', 'Mineral water'],
      desserts: ['Gulab jamun', 'Kheer'],
      minGuests: 75,
    },
    {
      id: 'm3',
      name: 'Fusion Premium Package',
      description: 'Mix of Pakistani and Chinese favorites',
      tier: 'gold',
      pricePerHead: 2200,
      dishes: ['d1', 'd4', 'd6', 'd8', 'd9'],
      beverages: ['Soft drinks', 'Fresh juices', 'Mineral water'],
      desserts: ['Ice cream', 'Fruit platter'],
      minGuests: 100,
    },
  ];

  // Filter dishes
  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dish.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCuisine = selectedCuisine === 'all' || dish.cuisineId === selectedCuisine;
    const matchesCategory = selectedCategory === 'all' || dish.categoryId === selectedCategory;
    return matchesSearch && matchesCuisine && matchesCategory;
  });

  const getCuisineName = (cuisineId: string) => {
    return cuisines.find(c => c.id === cuisineId)?.name || 'Unknown';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="size-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Management System</h1>
              <p className="text-sm text-gray-500">Manage recipes, dishes, and menu templates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setEditingDish(null);
                setShowDishDialog(true);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="size-4 mr-2" />
              Add New Dish
            </Button>
            <Button
              onClick={() => {
                setEditingMenu(null);
                setShowMenuDialog(true);
              }}
              variant="outline"
            >
              <MenuIcon className="size-4 mr-2" />
              Create Menu Template
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'dishes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dish Database ({dishes.length})
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'menus'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu Templates ({menuTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'categories'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('cuisines')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'cuisines'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cuisines ({cuisines.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dishes' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="bg-white border-b px-6 py-4 flex-shrink-0">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search dishes by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Cuisines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cuisines</SelectItem>
                      {cuisines.map(cuisine => (
                        <SelectItem key={cuisine.id} value={cuisine.id}>
                          {cuisine.icon} {cuisine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories
                        .filter(cat => selectedCuisine === 'all' || cat.cuisineId === selectedCuisine)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredDishes.length} dish{filteredDishes.length !== 1 ? 'es' : ''}
              </div>
            </div>

            {/* Dishes Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDishes.map(dish => {
                  const category = getCategory(dish.categoryId);
                  const profit = dish.sellingPrice - dish.costPerServing;
                  const profitMargin = ((profit / dish.sellingPrice) * 100).toFixed(1);

                  return (
                    <div
                      key={dish.id}
                      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-4"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{dish.name}</h3>
                            {dish.isSignature && (
                              <Star className="size-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {dish.isPopular && (
                              <Flame className="size-4 text-orange-500" />
                            )}
                          </div>
                          {dish.nameUrdu && (
                            <p className="text-sm text-gray-500 mb-1">{dish.nameUrdu}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {getCuisineName(dish.cuisineId)}
                            </span>
                            <ChevronRight className="size-3" />
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {getCategoryName(dish.categoryId)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingDish(dish);
                              setShowDishDialog(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded text-red-600">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dish.description}</p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="size-3" />
                          <span>{dish.cookingTime}m</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="size-3" />
                          <span>Serves {dish.servingSize}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className={`size-3 ${
                            dish.spiceLevel === 'very-hot' ? 'text-red-600' :
                            dish.spiceLevel === 'hot' ? 'text-orange-600' :
                            dish.spiceLevel === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`} />
                          <span className="capitalize text-gray-600">{dish.spiceLevel}</span>
                        </div>
                      </div>

                      {/* Station Badge */}
                      {category && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            <Package className="size-3" />
                            {category.preparationStation}
                          </span>
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cost per serving:</span>
                          <span className="font-medium">PKR {dish.costPerServing.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Selling price:</span>
                          <span className="font-bold text-green-700">PKR {dish.sellingPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Profit margin:</span>
                          <span className="font-medium text-blue-700">{profitMargin}%</span>
                        </div>
                      </div>

                      {/* View Recipe Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          setEditingDish(dish);
                          setShowDishDialog(true);
                        }}
                      >
                        <BookOpen className="size-4 mr-2" />
                        View Full Recipe
                      </Button>
                    </div>
                  );
                })}
              </div>

              {filteredDishes.length === 0 && (
                <div className="text-center py-12">
                  <ChefHat className="size-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No dishes found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'menus' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuTemplates.map(menu => (
                <div key={menu.id} className="bg-white rounded-lg border shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{menu.name}</h3>
                      <p className="text-sm text-gray-600">{menu.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      menu.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                      menu.tier === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                      menu.tier === 'silver' ? 'bg-gray-200 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {menu.tier.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Main Dishes ({menu.dishes.length})</p>
                      <div className="space-y-1">
                        {menu.dishes.map(dishId => {
                          const dish = dishes.find(d => d.id === dishId);
                          return dish ? (
                            <div key={dishId} className="text-sm text-gray-600 flex items-center gap-2">
                              <ChevronRight className="size-3" />
                              {dish.name}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Beverages</p>
                      <p className="text-sm text-gray-600">{menu.beverages.join(', ')}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Desserts</p>
                      <p className="text-sm text-gray-600">{menu.desserts.join(', ')}</p>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Price per head:</span>
                        <span className="text-xl font-bold text-green-700">PKR {menu.pricePerHead.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500">Minimum {menu.minGuests} guests</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingMenu(menu);
                          setShowMenuDialog(true);
                        }}
                      >
                        <Edit className="size-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Copy className="size-4 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => {
                const cuisine = cuisines.find(c => c.id === category.cuisineId);
                const dishCount = dishes.filter(d => d.categoryId === category.id).length;
                return (
                  <div key={category.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        {cuisine && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {cuisine.icon} {cuisine.name}
                          </span>
                        )}
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
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Preparation Station:</span>
                        <span className="font-medium">{category.preparationStation}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-600">Total Dishes:</span>
                        <span className="font-medium">{dishCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'cuisines' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cuisines.map(cuisine => {
                const categoryCount = categories.filter(c => c.cuisineId === cuisine.id).length;
                const dishCount = dishes.filter(d => d.cuisineId === cuisine.id).length;
                return (
                  <div key={cuisine.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-3">{cuisine.icon}</div>
                      <h3 className="font-bold text-xl mb-1">{cuisine.name}</h3>
                      <p className="text-sm text-gray-600">{cuisine.description}</p>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Categories:</span>
                        <span className="font-medium">{categoryCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Dishes:</span>
                        <span className="font-medium">{dishCount}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm">
                        <Edit className="size-3 inline mr-1" />
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm">
                        <Trash2 className="size-3 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dish Dialog - Placeholder for now */}
      <Dialog open={showDishDialog} onOpenChange={setShowDishDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDish ? `${editingDish.name} - Full Recipe` : 'Add New Dish'}
            </DialogTitle>
            <DialogDescription>
              {editingDish ? 'View and edit recipe details, ingredients, and preparation steps' : 'Create a new dish with complete recipe information'}
            </DialogDescription>
          </DialogHeader>
          
          {editingDish && (
            <div className="space-y-6">
              {/* Ingredients */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  Ingredients
                </h4>
                <ul className="space-y-1">
                  {editingDish.ingredients.map((ingredient, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="size-1.5 bg-orange-600 rounded-full" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preparation Steps */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Preparation Steps
                </h4>
                <ol className="space-y-2">
                  {editingDish.preparationSteps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex gap-3">
                      <span className="font-bold text-orange-600 min-w-[24px]">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Dietary Info */}
              <div>
                <h4 className="font-semibold mb-2">Dietary Information</h4>
                <div className="flex flex-wrap gap-2">
                  {editingDish.dietaryInfo.map((info, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {info}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowDishDialog(false)}>
              Close
            </Button>
            {!editingDish && (
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="size-4 mr-2" />
                Save Dish
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}