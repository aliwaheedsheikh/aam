import { useState } from 'react';
import { 
  Calendar, 
  ChefHat, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Clock,
  TrendingUp,
  Database,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { systemFlowGuide } from '../data/dummyData';

export function SystemFlowDiagram() {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const getStepIcon = (module: string) => {
    switch (module) {
      case 'Inquiry Follow-ups':
        return Calendar;
      case 'Banquet Kitchen Management':
        return ChefHat;
      case 'Procurement & Vendor Management':
        return ShoppingCart;
      case 'Inventory Management':
        return Package;
      case 'Accounts & Finance':
        return DollarSign;
      case 'Tentative Follow-Up':
        return Clock;
      case 'Banquet Kitchen Production':
        return ChefHat;
      default:
        return Database;
    }
  };

  const getStepColor = (module: string) => {
    switch (module) {
      case 'Inquiry Follow-ups':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Banquet Kitchen Management':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Procurement & Vendor Management':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'Inventory Management':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Accounts & Finance':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'Tentative Follow-Up':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Banquet Kitchen Production':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg">
              <TrendingUp className="size-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{systemFlowGuide.title}</h1>
              <p className="text-gray-600 mt-1">
                Understanding how data flows through your Banquet/Marquee ERP System
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="size-5 text-blue-600" />
                <span className="font-semibold text-blue-900">9 Steps</span>
              </div>
              <p className="text-sm text-blue-700">Complete workflow cycle</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="size-5 text-green-600" />
                <span className="font-semibold text-green-900">5 Roles</span>
              </div>
              <p className="text-sm text-green-700">Different user types involved</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="size-5 text-purple-600" />
                <span className="font-semibold text-purple-900">10 Stores</span>
              </div>
              <p className="text-sm text-purple-700">Inventory locations tracked</p>
            </div>
          </div>
        </div>

        {/* Flow Steps */}
        <div className="space-y-4">
          {systemFlowGuide.steps.map((step, index) => {
            const Icon = getStepIcon(step.module);
            const isSelected = selectedStep === index;
            const colorClass = getStepColor(step.module);

            return (
              <div
                key={step.step}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedStep(isSelected ? null : index)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                        {step.step}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`px-4 py-2 rounded-lg border ${colorClass} flex items-center gap-2`}>
                          <Icon className="size-5" />
                          <span className="font-semibold">{step.module}</span>
                        </div>
                        <ArrowRight className="size-5 text-gray-400" />
                        <span className="font-bold text-gray-900">{step.action}</span>
                      </div>

                      <p className="text-gray-700 mb-3">{step.description}</p>

                      {/* Expandable Details */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="size-4 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-900">Data Created:</span>
                            </div>
                            <p className="text-sm text-blue-700">{step.dataCreated}</p>
                          </div>

                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="size-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-900">Involved Users:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {step.involvedUsers.map((user, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white px-3 py-1 rounded-full text-sm text-green-700 border border-green-200"
                                >
                                  {user}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      <CheckCircle className="size-6 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Insights */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="size-6" />
            <h2 className="text-2xl font-bold">Key System Insights</h2>
          </div>
          <ul className="space-y-3">
            {systemFlowGuide.keyInsights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="size-5 flex-shrink-0 mt-0.5" />
                <span className="text-white/95">{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Example Data Flow */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📊 Example: Wedding Booking Flow
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 1
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Ahmed Khan</strong> calls Front Office for wedding booking on Jan 15, 2025.
                  Front Office creates booking for 500 guests at PKR 2,500/person = PKR 15 Lakh total.
                  Receives advance payment of PKR 5 Lakh.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 7
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Banquet Chef</strong> creates production order: 500 portions of Chicken Karahi,
                  Mutton Biryani, and Chicken Corn Soup. System calculates ingredient requirements.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 8
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Procurement Team</strong> creates purchase orders: 150kg chicken, 100kg mutton
                  from Al-Madina Meat Shop. Total: PKR 1.875 Lakh.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 12
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Store Keeper</strong> receives stock in Main Store. <strong>System automatically</strong> issues
                  125kg chicken and 100kg mutton to Banquet Kitchen Store based on production order.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 15
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Banquet Kitchen</strong> prepares food and serves event. Production order marked complete.
                  Cost tracked: PKR 4.6 Lakh for food.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-semibold text-sm">
                Day 16
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  <strong>Accounts Team</strong> recognizes revenue (PKR 15 Lakh), records final payment
                  (PKR 10 Lakh), and calculates profit: PKR 8.125 Lakh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
