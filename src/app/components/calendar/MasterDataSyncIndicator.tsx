import { useEffect, useState } from 'react';
import { CheckCircle, RefreshCw, Database } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

/**
 * Visual indicator showing Master Data sync status
 * Displays when data is loaded from Master Setup
 */
export function MasterDataSyncIndicator() {
  const {
    venues,
    primeSpaces,
    subSpaces,
    eventTypes,
    timeSlots,
    services,
    packages,
    advanceRules,
  } = useMasterData();

  const [showSync, setShowSync] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Show sync animation when data changes
    setShowSync(true);
    setLastUpdate(new Date());
    
    const timer = setTimeout(() => {
      setShowSync(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [venues, primeSpaces, subSpaces, eventTypes, timeSlots, services, packages, advanceRules]);

  const totalRecords = 
    venues.length + 
    primeSpaces.length + 
    subSpaces.length + 
    eventTypes.length + 
    timeSlots.length + 
    services.length + 
    packages.length + 
    advanceRules.length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`bg-white border-2 rounded-lg shadow-lg p-3 transition-all duration-300 ${
          showSync ? 'border-green-500 scale-105' : 'border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {showSync ? (
            <RefreshCw className="size-5 text-green-600 animate-spin" />
          ) : (
            <Database className="size-5 text-blue-600" />
          )}
          <div className="text-sm">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              Master Data
              {showSync && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Synced
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {totalRecords} records loaded
            </div>
          </div>
        </div>
        
        {/* Detailed breakdown on hover */}
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between gap-4">
            <span>Venues:</span>
            <span className="font-medium">{venues.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Prime Spaces:</span>
            <span className="font-medium">{primeSpaces.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Sub Spaces:</span>
            <span className="font-medium">{subSpaces.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Event Types:</span>
            <span className="font-medium">{eventTypes.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Time Slots:</span>
            <span className="font-medium">{timeSlots.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Services:</span>
            <span className="font-medium">{services.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Packages:</span>
            <span className="font-medium">{packages.length}</span>
          </div>
          {advanceRules.length > 0 && (
            <div className="flex justify-between gap-4">
              <span>Advance Rules:</span>
              <span className="font-medium">{advanceRules.length}</span>
            </div>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1 text-xs text-gray-500">
          <CheckCircle className="size-3 text-green-600" />
          <span>
            Last synced: {lastUpdate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
