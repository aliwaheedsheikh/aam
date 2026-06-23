import { Card } from '@/app/components/ui/card';
import { Building2, Minimize2, Check, X, AlertTriangle } from 'lucide-react';

/**
 * VISUAL EXAMPLES: Venue Selection Methods
 * 
 * This component demonstrates the three ways to select venues with visual examples.
 * Can be embedded in documentation or shown as a modal to train staff.
 */

export function VenueSelectionExamples() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 bg-gray-50">
          <div>
            <h2 className="mb-2">Venue Selection Visual Guide</h2>
            <p className="text-sm text-gray-600">
              Learn how to correctly select venues for different booking types
            </p>
          </div>

          {/* Example 1: Full Venue */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="size-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Option 1: Full Venue Booking</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer needs the ENTIRE venue with maximum capacity (800 guests)
                  </p>
                </div>

                {/* Selection Fields */}
                <div className="bg-white border-2 border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Venue</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
                        Aiwan-e-Akbari
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                        <Building2 className="size-3 text-blue-600" />
                        Prime Space
                      </label>
                      <div className="px-3 py-2 bg-blue-50 border-2 border-blue-500 rounded text-sm font-medium text-blue-900 flex items-center gap-2">
                        <Check className="size-4 text-green-600" />
                        Marquee 1
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                        <Minimize2 className="size-3 text-purple-600" />
                        Sub Space
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-400 flex items-center gap-2">
                        <X className="size-4 text-red-500" />
                        [Leave Empty]
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <Check className="size-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 font-medium">
                      Full venue booking - All sub-spaces will be blocked
                    </span>
                  </div>
                </div>

                {/* Result */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Result:</p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Marquee 1 fully booked (800 guests capacity)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>M1-A automatically blocked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>M1-B automatically blocked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-medium">💰</span>
                      <span>Charge: PKR 100,000 (full venue rate)</span>
                    </li>
                  </ul>
                </div>

                {/* Use Case */}
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">📌 Use Case Example:</p>
                  <p className="text-xs text-blue-800">
                    "Ali & Sara Wedding - 800 guests" → Need full Marquee 1 with all facilities
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Example 2: Partial Venue */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Minimize2 className="size-6 text-purple-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Option 2: Partial Venue Booking</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer needs only PART of the venue with smaller capacity (250 guests)
                  </p>
                </div>

                {/* Selection Fields */}
                <div className="bg-white border-2 border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Venue</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
                        Aiwan-e-Akbari
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                        <Building2 className="size-3 text-blue-600" />
                        Prime Space
                      </label>
                      <div className="px-3 py-2 bg-blue-50 border border-blue-300 rounded text-sm font-medium text-blue-900 flex items-center gap-2">
                        <Check className="size-4 text-green-600" />
                        Marquee 1
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                        <Minimize2 className="size-3 text-purple-600" />
                        Sub Space
                      </label>
                      <div className="px-3 py-2 bg-purple-50 border-2 border-purple-500 rounded text-sm font-medium text-purple-900 flex items-center gap-2">
                        <Check className="size-4 text-green-600" />
                        M1-A
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2">
                    <Check className="size-4 text-purple-600 flex-shrink-0" />
                    <span className="text-sm text-purple-800 font-medium">
                      Partial booking - Other sub-spaces remain available
                    </span>
                  </div>
                </div>

                {/* Result */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Result:</p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>M1-A booked (250 guests capacity)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Marquee 1 (full venue) automatically blocked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>M1-B remains AVAILABLE for another customer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-medium">💰</span>
                      <span>Charge: PKR 50,000 (partial venue rate)</span>
                    </li>
                  </ul>
                </div>

                {/* Use Case */}
                <div className="bg-purple-50 rounded p-3">
                  <p className="text-xs font-medium text-purple-900 mb-1">📌 Use Case Example:</p>
                  <p className="text-xs text-purple-800">
                    "ABC Corporation Annual Dinner - 250 guests" → Need only M1-A section
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Example 3: Multiple Venues */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-6 text-orange-600" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">Option 3: Multiple Venues (Workaround)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer needs MULTIPLE separate venues (e.g., Marquee 1 + Marquee 2)
                  </p>
                </div>

                {/* Current Limitation */}
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="size-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">Current Limitation</span>
                  </div>
                  <p className="text-sm text-orange-800">
                    The system does NOT support selecting multiple venues in a single booking.
                  </p>
                </div>

                {/* Workaround */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Workaround Solution:</p>
                  
                  {/* Booking 1 */}
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Booking #1</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Venue</label>
                        <div className="text-sm font-medium">Aiwan-e-Akbari</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Prime Space</label>
                        <div className="text-sm font-medium text-blue-900">Marquee 1 ✓</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Sub Space</label>
                        <div className="text-sm text-gray-400">[Empty]</div>
                      </div>
                    </div>
                  </div>

                  {/* Booking 2 */}
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Booking #2 (Separate)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Venue</label>
                        <div className="text-sm font-medium">Aiwan-e-Akbari</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Prime Space</label>
                        <div className="text-sm font-medium text-blue-900">Marquee 2 ✓</div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Sub Space</label>
                        <div className="text-sm text-gray-400">[Empty]</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Result:</p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Both Marquee 1 and Marquee 2 are booked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-medium">📋</span>
                      <span>Two separate bookings created for same customer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-medium">💰</span>
                      <span>Charge: PKR 100,000 + PKR 100,000 = PKR 200,000 (two invoices)</span>
                    </li>
                  </ul>
                </div>

                {/* Use Case */}
                <div className="bg-orange-50 rounded p-3">
                  <p className="text-xs font-medium text-orange-900 mb-1">📌 Use Case Example:</p>
                  <p className="text-xs text-orange-800">
                    "Large Corporate Conference - 1500 guests" → Need Marquee 1 + Marquee 2 simultaneously
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Comparison Table */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Booking Type</th>
                    <th className="text-center py-2 px-3 font-semibold">Prime Space</th>
                    <th className="text-center py-2 px-3 font-semibold">Sub Space</th>
                    <th className="text-center py-2 px-3 font-semibold">Capacity</th>
                    <th className="text-left py-2 px-3 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-blue-50">
                    <td className="py-3 px-3 font-medium">Full Venue</td>
                    <td className="text-center py-3 px-3">
                      <Check className="size-5 text-green-600 mx-auto" />
                    </td>
                    <td className="text-center py-3 px-3">
                      <X className="size-5 text-red-500 mx-auto" />
                    </td>
                    <td className="text-center py-3 px-3">800</td>
                    <td className="py-3 px-3 text-xs">All sub-spaces blocked</td>
                  </tr>
                  <tr className="border-b bg-purple-50">
                    <td className="py-3 px-3 font-medium">Partial Venue</td>
                    <td className="text-center py-3 px-3">
                      <Check className="size-5 text-green-600 mx-auto" />
                    </td>
                    <td className="text-center py-3 px-3">
                      <Check className="size-5 text-green-600 mx-auto" />
                    </td>
                    <td className="text-center py-3 px-3">250-400</td>
                    <td className="py-3 px-3 text-xs">Other sub-spaces available</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="py-3 px-3 font-medium">Multiple Venues</td>
                    <td className="text-center py-3 px-3 text-xs">
                      <div>Create</div>
                      <div>separate</div>
                      <div>bookings</div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <X className="size-5 text-red-500 mx-auto" />
                    </td>
                    <td className="text-center py-3 px-3">Multiple</td>
                    <td className="py-3 px-3 text-xs">Each venue booked separately</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}