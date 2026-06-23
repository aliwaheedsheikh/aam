import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  ChefHat,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Booking } from '../calendar/types-v2';

type RecipeIngredient = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type DishRecipe = {
  dishId: string;
  dishName: string;
  servingSize: number; // Base serving size (e.g., 4 people)
  ingredients: RecipeIngredient[];
};

type EventProduction = {
  eventId: string;
  eventName: string;
  time: string;
  guests: number;
  venue: string;
  dishes: {
    dishId: string;
    dishName: string;
    quantityToPrepare: number; // In servings
    actualGuests: number;
  }[];
  status: 'pending' | 'in-progress' | 'completed';
};

type ConsolidatedIngredient = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalRequired: number;
  currentStock: number;
  toBePurchased: number;
  events: string[]; // Event names using this ingredient
};

interface ProductionPlanningProps {
  bookings: Booking[];
}

export function ProductionPlanning({ bookings }: ProductionPlanningProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock recipe data with ingredient quantities
  const dishRecipes: DishRecipe[] = [
    {
      dishId: 'd1',
      dishName: 'Chicken Tikka',
      servingSize: 4,
      ingredients: [
        { ingredientId: 'ing1', ingredientName: 'Chicken Boneless', quantity: 1, unit: 'kg' },
        { ingredientId: 'ing15', ingredientName: 'Yogurt', quantity: 0.25, unit: 'kg' },
        { ingredientId: 'ing8', ingredientName: 'Ginger', quantity: 0.05, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantity: 0.05, unit: 'kg' },
        { ingredientId: 'ing10', ingredientName: 'Red Chili Powder', quantity: 0.02, unit: 'kg' },
        { ingredientId: 'ing14', ingredientName: 'Garam Masala', quantity: 0.01, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantity: 0.1, unit: 'liter' },
      ],
    },
    {
      dishId: 'd2',
      dishName: 'Seekh Kabab',
      servingSize: 4,
      ingredients: [
        { ingredientId: 'ing3', ingredientName: 'Beef (Boneless)', quantity: 0.8, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantity: 0.2, unit: 'kg' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantity: 0.05, unit: 'kg' },
        { ingredientId: 'ing13', ingredientName: 'Coriander Powder', quantity: 0.02, unit: 'kg' },
        { ingredientId: 'ing12', ingredientName: 'Cumin Seeds', quantity: 0.01, unit: 'kg' },
      ],
    },
    {
      dishId: 'd4',
      dishName: 'Chicken Karahi',
      servingSize: 6,
      ingredients: [
        { ingredientId: 'ing2', ingredientName: 'Chicken With Bone', quantity: 1.5, unit: 'kg' },
        { ingredientId: 'ing6', ingredientName: 'Tomatoes', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing7', ingredientName: 'Green Chilies', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'ing8', ingredientName: 'Ginger', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'ing19', ingredientName: 'Cooking Oil', quantity: 0.3, unit: 'liter' },
        { ingredientId: 'ing14', ingredientName: 'Garam Masala', quantity: 0.02, unit: 'kg' },
      ],
    },
    {
      dishId: 'd6',
      dishName: 'Chicken Biryani',
      servingSize: 8,
      ingredients: [
        { ingredientId: 'ing2', ingredientName: 'Chicken With Bone', quantity: 2, unit: 'kg' },
        { ingredientId: 'ing18', ingredientName: 'Basmati Rice (Premium)', quantity: 1, unit: 'kg' },
        { ingredientId: 'ing15', ingredientName: 'Yogurt', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantity: 0.5, unit: 'kg' },
        { ingredientId: 'ing6', ingredientName: 'Tomatoes', quantity: 0.3, unit: 'kg' },
        { ingredientId: 'ing8', ingredientName: 'Ginger', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantity: 0.1, unit: 'kg' },
        { ingredientId: 'ing20', ingredientName: 'Ghee (Pure)', quantity: 0.2, unit: 'kg' },
        { ingredientId: 'ing14', ingredientName: 'Garam Masala', quantity: 0.03, unit: 'kg' },
      ],
    },
    {
      dishId: 'd5',
      dishName: 'Mutton Korma',
      servingSize: 6,
      ingredients: [
        { ingredientId: 'ing4', ingredientName: 'Mutton', quantity: 1.5, unit: 'kg' },
        { ingredientId: 'ing15', ingredientName: 'Yogurt', quantity: 0.3, unit: 'kg' },
        { ingredientId: 'ing5', ingredientName: 'Onions', quantity: 0.4, unit: 'kg' },
        { ingredientId: 'ing16', ingredientName: 'Fresh Cream', quantity: 0.2, unit: 'liter' },
        { ingredientId: 'ing8', ingredientName: 'Ginger', quantity: 0.08, unit: 'kg' },
        { ingredientId: 'ing9', ingredientName: 'Garlic', quantity: 0.08, unit: 'kg' },
        { ingredientId: 'ing20', ingredientName: 'Ghee (Pure)', quantity: 0.15, unit: 'kg' },
        { ingredientId: 'ing14', ingredientName: 'Garam Masala', quantity: 0.02, unit: 'kg' },
      ],
    },
  ];

  // Mock current stock data
  const currentStock: Record<string, number> = {
    'ing1': 120, // Chicken Boneless
    'ing2': 200, // Chicken With Bone
    'ing3': 85,  // Beef
    'ing4': 60,  // Mutton
    'ing5': 250, // Onions
    'ing6': 180, // Tomatoes
    'ing7': 45,  // Green Chilies
    'ing8': 30,  // Ginger
    'ing9': 35,  // Garlic
    'ing10': 25, // Red Chili
    'ing12': 12, // Cumin
    'ing13': 15, // Coriander Powder
    'ing14': 10, // Garam Masala
    'ing15': 100, // Yogurt
    'ing16': 45, // Cream
    'ing18': 500, // Rice
    'ing19': 150, // Oil
    'ing20': 65, // Ghee
  };

  // Filter bookings for selected date
  const selectedDateBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date);
    return (
      bookingDate.toDateString() === selectedDate.toDateString() &&
      booking.status !== 'cancelled'
    );
  });

  // Create event production list
  const eventProductions: EventProduction[] = selectedDateBookings.map(booking => ({
    eventId: booking.id,
    eventName: booking.customerName,
    time: `${booking.eventTime || 'Not set'} (${booking.startTime} - ${booking.endTime})`,
    guests: booking.guests || 0,
    venue: booking.venueName,
    dishes: [
      { dishId: 'd1', dishName: 'Chicken Tikka', quantityToPrepare: 0, actualGuests: booking.guests || 0 },
      { dishId: 'd2', dishName: 'Seekh Kabab', quantityToPrepare: 0, actualGuests: booking.guests || 0 },
      { dishId: 'd4', dishName: 'Chicken Karahi', quantityToPrepare: 0, actualGuests: booking.guests || 0 },
      { dishId: 'd6', dishName: 'Chicken Biryani', quantityToPrepare: 0, actualGuests: booking.guests || 0 },
    ],
    status: 'pending',
  }));

  // Calculate consolidated ingredient requirements
  const calculateConsolidatedIngredients = (): ConsolidatedIngredient[] => {
    const ingredientMap = new Map<string, ConsolidatedIngredient>();

    eventProductions.forEach(event => {
      event.dishes.forEach(dish => {
        if (dish.quantityToPrepare > 0) {
          const recipe = dishRecipes.find(r => r.dishId === dish.dishId);
          if (!recipe) return;

          // Calculate multiplier based on guests vs recipe serving size
          const multiplier = dish.actualGuests / recipe.servingSize;

          recipe.ingredients.forEach(ing => {
            const requiredQty = ing.quantity * multiplier;

            if (ingredientMap.has(ing.ingredientId)) {
              const existing = ingredientMap.get(ing.ingredientId)!;
              existing.totalRequired += requiredQty;
              if (!existing.events.includes(event.eventName)) {
                existing.events.push(event.eventName);
              }
            } else {
              ingredientMap.set(ing.ingredientId, {
                ingredientId: ing.ingredientId,
                ingredientName: ing.ingredientName,
                unit: ing.unit,
                totalRequired: requiredQty,
                currentStock: currentStock[ing.ingredientId] || 0,
                toBePurchased: 0,
                events: [event.eventName],
              });
            }
          });
        }
      });
    });

    // Calculate toBePurchased
    const result = Array.from(ingredientMap.values()).map(ing => ({
      ...ing,
      toBePurchased: Math.max(0, ing.totalRequired - ing.currentStock),
    }));

    return result;
  };

  const consolidatedIngredients = calculateConsolidatedIngredients();
  const hasShortage = consolidatedIngredients.some(ing => ing.toBePurchased > 0);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="size-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Production Planning</h1>
              <p className="text-sm text-gray-500">View all events and calculate ingredient requirements</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Export Shopping List
            </Button>
            <Button variant="outline">
              <Printer className="size-4 mr-2" />
              Print Production Sheet
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePreviousDay}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[250px] text-center">
              <div className="font-semibold text-lg">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextDay}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button size="sm" onClick={handleToday}>
            Today
          </Button>
          <Input
            type="date"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                setSelectedDate(new Date(value));
              }
            }}
            className="w-[180px]"
          />

          {/* Summary Stats */}
          <div className="ml-auto flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-gray-500" />
              <span className="text-gray-600">Events:</span>
              <span className="font-bold text-lg">{selectedDateBookings.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gray-500" />
              <span className="text-gray-600">Total Guests:</span>
              <span className="font-bold text-lg">
                {selectedDateBookings.reduce((sum, b) => sum + (b.guests || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedDateBookings.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <CalendarIcon className="size-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Scheduled</h3>
            <p className="text-gray-500">There are no confirmed or tentative bookings for this date.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Events List */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ChefHat className="size-6" />
                Event Production Schedule
              </h2>
              <div className="space-y-4">
                {eventProductions.map((event, idx) => (
                  <div key={event.eventId} className="bg-white rounded-lg border p-5">
                    {/* Event Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium px-3 py-1 bg-purple-100 text-purple-700 rounded">
                            Event #{idx + 1}
                          </span>
                          <h3 className="font-bold text-lg">{event.eventName}</h3>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="size-4" />
                            {event.guests} guests
                          </div>
                          <div>{event.venue}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          event.status === 'completed' ? 'bg-green-100 text-green-700' :
                          event.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.status === 'completed' ? 'Completed' :
                           event.status === 'in-progress' ? 'In Progress' :
                           'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Dishes Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Dish Name</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-700">Guests</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-700">Quantity to Prepare</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {event.dishes.map(dish => (
                            <tr key={dish.dishId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{dish.dishName}</td>
                              <td className="px-4 py-3 text-center">{dish.actualGuests}</td>
                              <td className="px-4 py-3 text-center">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={dish.quantityToPrepare || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    dish.quantityToPrepare = value;
                                    // Trigger re-render
                                    setSelectedDate(new Date(selectedDate));
                                  }}
                                  className="w-24 text-center mx-auto"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                {dish.quantityToPrepare > 0 ? (
                                  <CheckCircle2 className="size-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-400 text-xs">Not set</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consolidated Ingredient Requirements */}
            {consolidatedIngredients.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="size-6" />
                    Consolidated Ingredient Requirements
                  </h2>
                  {hasShortage && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="size-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Ingredients need to be purchased!</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ingredient</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Required</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">In Stock</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">To Purchase</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Used In Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {consolidatedIngredients.map(ing => (
                        <tr key={ing.ingredientId} className={`${ing.toBePurchased > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-medium">{ing.ingredientName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold">{ing.totalRequired.toFixed(2)}</span> {ing.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={ing.currentStock < ing.totalRequired ? 'text-red-600 font-semibold' : ''}>
                              {ing.currentStock.toFixed(2)}
                            </span> {ing.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ing.toBePurchased > 0 ? (
                              <span className="px-3 py-1 bg-red-600 text-white rounded-full font-semibold">
                                {ing.toBePurchased.toFixed(2)} {ing.unit}
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">✓ Sufficient</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {ing.events.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
