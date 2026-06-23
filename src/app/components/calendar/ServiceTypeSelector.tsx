import { Building2, UtensilsCrossed, Package, Tent, Gift, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { ServiceType, SERVICE_TYPE_CONFIG } from './service-types';

interface ServiceTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (serviceType: ServiceType) => void;
  allowedServiceTypes?: ServiceType[];
}

export function ServiceTypeSelector({
  open,
  onClose,
  onSelect,
  allowedServiceTypes,
}: ServiceTypeSelectorProps) {
  const serviceTypes: { type: ServiceType; icon: any }[] = [
    { type: 'venue-booking', icon: Building2 },
    { type: 'outdoor-catering', icon: UtensilsCrossed },
    { type: 'food-supply', icon: Package },
    { type: 'rental-services', icon: Tent },
    { type: 'mixed-package', icon: Gift },
  ].filter(({ type }) => !allowedServiceTypes || allowedServiceTypes.includes(type));

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hoverBorder: 'hover:border-blue-400',
        hoverBg: 'hover:bg-blue-100',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        desc: 'text-blue-700',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        hoverBorder: 'hover:border-purple-400',
        hoverBg: 'hover:bg-purple-100',
        icon: 'text-purple-600',
        title: 'text-purple-900',
        desc: 'text-purple-700',
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        hoverBorder: 'hover:border-orange-400',
        hoverBg: 'hover:bg-orange-100',
        icon: 'text-orange-600',
        title: 'text-orange-900',
        desc: 'text-orange-700',
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        hoverBorder: 'hover:border-green-400',
        hoverBg: 'hover:bg-green-100',
        icon: 'text-green-600',
        title: 'text-green-900',
        desc: 'text-green-700',
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        hoverBorder: 'hover:border-indigo-400',
        hoverBg: 'hover:bg-indigo-100',
        icon: 'text-indigo-600',
        title: 'text-indigo-900',
        desc: 'text-indigo-700',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
          Select Service Type
        </DialogTitle>
        <DialogDescription className="text-gray-600 mb-6">
          Choose the type of service you want to book. Each service type has its own workflow and requirements.
        </DialogDescription>

        <div className="grid grid-cols-2 gap-4">
          {serviceTypes.map(({ type, icon: Icon }) => {
            const config = SERVICE_TYPE_CONFIG[type];
            const colors = getColorClasses(config.color);
            
            return (
              <button
                key={type}
                onClick={() => {
                  onSelect(type);
                  onClose();
                }}
                className={`
                  group relative p-6 rounded-xl border-2 transition-all text-left
                  ${colors.bg} ${colors.border} ${colors.hoverBorder} ${colors.hoverBg}
                  hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-white shadow-sm ${colors.icon}`}>
                    <Icon className="size-8" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{config.icon}</span>
                      <h3 className={`font-bold text-lg ${colors.title}`}>
                        {config.label}
                      </h3>
                    </div>
                    <p className={`text-sm ${colors.desc} mb-3`}>
                      {config.description}
                    </p>
                    
                    {/* Features */}
                    <div className="space-y-1">
                      {config.usesVenueCalendar && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Uses venue calendar
                        </div>
                      )}
                      {config.usesKitchen && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Kitchen allocation required
                        </div>
                      )}
                      {config.requiresStaff && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Staff assignment needed
                        </div>
                      )}
                      {config.requiresTransport && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Transport logistics
                        </div>
                      )}
                      {config.usesInventory && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Inventory tracking
                        </div>
                      )}
                    </div>
                  </div>

                  <ArrowRight className={`size-5 ${colors.icon} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>

                {/* Coming Soon Badge (for mixed package) */}
                {type === 'mixed-package' && (
                  <div className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                    Coming Soon
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Guide */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3 text-sm">
            <div className="text-blue-600 font-semibold mt-0.5">💡</div>
            <div className="text-blue-800">
              <p className="font-semibold mb-1">Quick Guide:</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Venue Booking:</strong> For in-house banquet events at your venues</li>
                <li><strong>Outdoor Catering:</strong> When providing food + service at customer's location</li>
                <li><strong>Food Supply:</strong> Only food delivery, no venue, no service staff</li>
                <li><strong>Rental Services:</strong> Equipment/furniture rental (chairs, sound, décor, etc.)</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
