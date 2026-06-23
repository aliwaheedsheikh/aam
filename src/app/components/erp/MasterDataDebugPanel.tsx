import { useState } from 'react';
import { Database, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';

/**
 * Debug Panel for Master Data - Development Tool
 * Shows all loaded Master Data in a collapsible panel
 * Remove this component in production or hide behind a dev flag
 */
export function MasterDataDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  const masterData = useMasterData();
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
      >
        <Database className="size-4" />
        <span className="text-sm font-medium">Master Data Debug</span>
      </button>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sections = [
    { key: 'venues', label: 'Venues', data: masterData.venues },
    { key: 'primeSpaces', label: 'Prime Spaces', data: masterData.primeSpaces },
    { key: 'subSpaces', label: 'Sub Spaces', data: masterData.subSpaces },
    { key: 'layouts', label: 'Layouts', data: masterData.layouts },
    { key: 'eventTypes', label: 'Event Types', data: masterData.eventTypes },
    { key: 'timeSlots', label: 'Time Slots', data: masterData.timeSlots },
    { key: 'services', label: 'Services', data: masterData.services },
    { key: 'packages', label: 'Menu Packages', data: masterData.packages },
    { key: 'advanceRules', label: 'Advance Rules', data: masterData.advanceRules },
    { key: 'taxGroups', label: 'Tax Groups', data: masterData.taxGroups },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 max-h-[80vh] bg-white border-2 border-purple-500 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-purple-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-5" />
          <h3 className="font-bold">Master Data Debug Panel</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-purple-700 p-1 rounded transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map(section => {
          const isExpanded = expandedSections.includes(section.key);
          const count = Array.isArray(section.data) ? section.data.length : 0;
          
          return (
            <div key={section.key} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-gray-600" />
                  ) : (
                    <ChevronUp className="size-4 text-gray-600" />
                  )}
                  <span className="font-semibold text-sm">{section.label}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              </button>
              
              {isExpanded && (
                <div className="bg-gray-50 p-3 border-t max-h-64 overflow-y-auto">
                  {count === 0 ? (
                    <p className="text-xs text-gray-500 italic">No data configured</p>
                  ) : (
                    <pre className="text-xs font-mono overflow-x-auto">
                      {JSON.stringify(section.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with stats */}
      <div className="border-t bg-gray-50 p-3 text-xs space-y-1">
        <div className="font-semibold text-gray-700">Quick Stats:</div>
        <div className="grid grid-cols-2 gap-2">
          <div>Total Venues: <span className="font-semibold">{masterData.venues.length}</span></div>
          <div>Total Spaces: <span className="font-semibold">{masterData.primeSpaces.length + masterData.subSpaces.length}</span></div>
          <div>Event Types: <span className="font-semibold">{masterData.eventTypes.length}</span></div>
          <div>Services: <span className="font-semibold">{masterData.services.length}</span></div>
        </div>
        <button
          onClick={() => masterData.refreshData()}
          className="mt-2 w-full bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}
