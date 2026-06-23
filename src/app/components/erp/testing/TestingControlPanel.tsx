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
  Settings,
  Database,
  Trash2,
  Download,
  Upload,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  RefreshCw,
  Package,
} from 'lucide-react';
import { venueDataStore, primeSpaceDataStore, subSpaceDataStore, layoutDataStore, eventConfigDataStore, financialConfigDataStore, clearAllMasterData, exportAllMasterData, importAllMasterData } from '../../../lib/masterDataStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';

interface TestingControlPanelProps {
  onDataChange?: () => void;
}

export function TestingControlPanel({ onDataChange }: TestingControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Generate comprehensive sample data
  const generateSampleData = () => {
    // Sample Venues
    const sampleVenues = [
      {
        id: 'venue-1',
        venueName: 'Aiwan-e-Akbari Grand Banquet',
        venueCode: 'VEN001',
        city: 'Lahore',
        area: 'Gulberg III',
        address: 'Main Boulevard, Block L',
        contactPerson: 'Mr. Ahmed Khan',
        phone: '+92-300-1234567',
        email: 'contact@aiwanakbari.com',
        venueType: 'Marquees & Halls',
        numberOfMarquees: 3,
        numberOfLawns: 3,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'venue-2',
        venueName: 'Emerald Banquet Hall',
        venueCode: 'VEN002',
        city: 'Lahore',
        area: 'DHA Phase 5',
        address: 'Commercial Area, Y Block',
        contactPerson: 'Mrs. Fatima Ali',
        phone: '+92-321-9876543',
        email: 'info@emeraldbanquet.pk',
        venueType: 'Halls Only',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'venue-3',
        venueName: 'Royal Garden Marquees',
        venueCode: 'VEN003',
        city: 'Karachi',
        area: 'Clifton',
        address: 'Sea View Road',
        contactPerson: 'Mr. Hassan Raza',
        phone: '+92-333-5554444',
        email: 'bookings@royalgarden.com',
        venueType: 'Marquees & Halls',
        numberOfMarquees: 5,
        numberOfLawns: 2,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    // Sample Prime Spaces
    const samplePrimeSpaces = [
      // Aiwan-e-Akbari
      {
        id: 'ps-1',
        venueId: 'venue-1',
        spaceName: 'Grand Marquee 1',
        spaceCode: 'VEN001-PS001',
        spaceType: 'Marquee',
        defaultSeatingCapacity: 1000,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'ps-2',
        venueId: 'venue-1',
        spaceName: 'Crystal Marquee 2',
        spaceCode: 'VEN001-PS002',
        spaceType: 'Marquee',
        defaultSeatingCapacity: 800,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'ps-3',
        venueId: 'venue-1',
        spaceName: 'Royal Marquee 3',
        spaceCode: 'VEN001-PS003',
        spaceType: 'Marquee',
        defaultSeatingCapacity: 600,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'ps-4',
        venueId: 'venue-1',
        spaceName: 'Garden Lawn 1',
        spaceCode: 'VEN001-PS004',
        spaceType: 'Lawn',
        defaultSeatingCapacity: 1200,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'ps-5',
        venueId: 'venue-1',
        spaceName: 'Premium Lawn 2',
        spaceCode: 'VEN001-PS005',
        spaceType: 'Lawn',
        defaultSeatingCapacity: 900,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      // Emerald Banquet Hall
      {
        id: 'ps-6',
        venueId: 'venue-2',
        spaceName: 'Emerald Hall A',
        spaceCode: 'VEN002-PS001',
        spaceType: 'Hall',
        defaultSeatingCapacity: 700,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'ps-7',
        venueId: 'venue-2',
        spaceName: 'Emerald Hall B',
        spaceCode: 'VEN002-PS002',
        spaceType: 'Hall',
        defaultSeatingCapacity: 500,
        allowSubSpaces: false,
        isActive: true,
        createdAt: new Date(),
      },
      // Royal Garden
      {
        id: 'ps-8',
        venueId: 'venue-3',
        spaceName: 'Majestic Marquee',
        spaceCode: 'VEN003-PS001',
        spaceType: 'Marquee',
        defaultSeatingCapacity: 1500,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    // Sample Sub Spaces
    const sampleSubSpaces = [
      // Grand Marquee 1
      { id: 'ss-1', primeSpaceId: 'ps-1', subSpaceName: 'Grand Marquee 1-A', subSpaceCode: 'VEN001-PS001-SS001', useCustomCapacity: true, customCapacity: 500, isActive: true, createdAt: new Date() },
      { id: 'ss-2', primeSpaceId: 'ps-1', subSpaceName: 'Grand Marquee 1-B', subSpaceCode: 'VEN001-PS001-SS002', useCustomCapacity: true, customCapacity: 500, isActive: true, createdAt: new Date() },
      // Crystal Marquee 2
      { id: 'ss-3', primeSpaceId: 'ps-2', subSpaceName: 'Crystal Marquee 2-A', subSpaceCode: 'VEN001-PS002-SS001', useCustomCapacity: true, customCapacity: 400, isActive: true, createdAt: new Date() },
      { id: 'ss-4', primeSpaceId: 'ps-2', subSpaceName: 'Crystal Marquee 2-B', subSpaceCode: 'VEN001-PS002-SS002', useCustomCapacity: true, customCapacity: 400, isActive: true, createdAt: new Date() },
      // Royal Marquee 3
      { id: 'ss-5', primeSpaceId: 'ps-3', subSpaceName: 'Royal Marquee 3-A', subSpaceCode: 'VEN001-PS003-SS001', useCustomCapacity: true, customCapacity: 300, isActive: true, createdAt: new Date() },
      { id: 'ss-6', primeSpaceId: 'ps-3', subSpaceName: 'Royal Marquee 3-B', subSpaceCode: 'VEN001-PS003-SS002', useCustomCapacity: true, customCapacity: 300, isActive: true, createdAt: new Date() },
      // Garden Lawn 1
      { id: 'ss-7', primeSpaceId: 'ps-4', subSpaceName: 'Garden Lawn 1 - North', subSpaceCode: 'VEN001-PS004-SS001', useCustomCapacity: true, customCapacity: 600, isActive: true, createdAt: new Date() },
      { id: 'ss-8', primeSpaceId: 'ps-4', subSpaceName: 'Garden Lawn 1 - South', subSpaceCode: 'VEN001-PS004-SS002', useCustomCapacity: true, customCapacity: 600, isActive: true, createdAt: new Date() },
      // Premium Lawn 2
      { id: 'ss-9', primeSpaceId: 'ps-5', subSpaceName: 'Premium Lawn 2 - East', subSpaceCode: 'VEN001-PS005-SS001', useCustomCapacity: true, customCapacity: 450, isActive: true, createdAt: new Date() },
      { id: 'ss-10', primeSpaceId: 'ps-5', subSpaceName: 'Premium Lawn 2 - West', subSpaceCode: 'VEN001-PS005-SS002', useCustomCapacity: true, customCapacity: 450, isActive: true, createdAt: new Date() },
      // Emerald Hall A
      { id: 'ss-11', primeSpaceId: 'ps-6', subSpaceName: 'Emerald Hall A-1', subSpaceCode: 'VEN002-PS001-SS001', useCustomCapacity: true, customCapacity: 350, isActive: true, createdAt: new Date() },
      { id: 'ss-12', primeSpaceId: 'ps-6', subSpaceName: 'Emerald Hall A-2', subSpaceCode: 'VEN002-PS001-SS002', useCustomCapacity: true, customCapacity: 350, isActive: true, createdAt: new Date() },
      // Majestic Marquee
      { id: 'ss-13', primeSpaceId: 'ps-8', subSpaceName: 'Majestic Marquee - Section A', subSpaceCode: 'VEN003-PS001-SS001', useCustomCapacity: true, customCapacity: 750, isActive: true, createdAt: new Date() },
      { id: 'ss-14', primeSpaceId: 'ps-8', subSpaceName: 'Majestic Marquee - Section B', subSpaceCode: 'VEN003-PS001-SS002', useCustomCapacity: true, customCapacity: 750, isActive: true, createdAt: new Date() },
    ];

    // Sample Layouts
    const sampleLayouts = [
      {
        id: 'layout-1',
        venueId: 'venue-1',
        primeSpaceId: 'ps-1',
        layoutName: 'Theatre Style',
        layoutCode: 'VEN001-PS001-LY001',
        chairsPerTable: 0,
        numberOfTables: 0,
        totalCapacity: 1000,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'layout-2',
        venueId: 'venue-1',
        primeSpaceId: 'ps-1',
        layoutName: 'Round Tables (10 Seater)',
        layoutCode: 'VEN001-PS001-LY002',
        chairsPerTable: 10,
        numberOfTables: 100,
        totalCapacity: 1000,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    try {
      venueDataStore.saveVenues(sampleVenues);
      primeSpaceDataStore.savePrimeSpaces(samplePrimeSpaces);
      subSpaceDataStore.saveSubSpaces(sampleSubSpaces);
      layoutDataStore.saveLayouts(sampleLayouts);
      
      showMessage('success', '✅ Sample data generated successfully! 3 Venues, 8 Prime Spaces, 14 Sub Spaces, 2 Layouts');
      onDataChange?.();
    } catch (error) {
      showMessage('error', '❌ Failed to generate sample data');
    }
  };

  // Generate minimal test data
  const generateMinimalData = () => {
    const minimalVenues = [
      {
        id: '1',
        venueName: 'Test Venue',
        venueCode: 'TEST001',
        city: 'Lahore',
        area: 'Test Area',
        venueType: 'Marquees & Halls',
        numberOfMarquees: 1,
        numberOfLawns: 1,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const minimalPrimeSpaces = [
      {
        id: '1',
        venueId: '1',
        spaceName: 'Test Hall',
        spaceCode: 'TEST001-PS001',
        spaceType: 'Hall',
        defaultSeatingCapacity: 500,
        allowSubSpaces: true,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    const minimalSubSpaces = [
      {
        id: '1',
        primeSpaceId: '1',
        subSpaceName: 'Test Hall - Section A',
        subSpaceCode: 'TEST001-PS001-SS001',
        useCustomCapacity: true,
        customCapacity: 250,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    try {
      venueDataStore.saveVenues(minimalVenues);
      primeSpaceDataStore.savePrimeSpaces(minimalPrimeSpaces);
      subSpaceDataStore.saveSubSpaces(minimalSubSpaces);
      
      showMessage('success', '✅ Minimal test data created: 1 Venue, 1 Prime Space, 1 Sub Space');
      onDataChange?.();
    } catch (error) {
      showMessage('error', '❌ Failed to generate minimal data');
    }
  };

  // Clear all data
  const handleClearAllData = () => {
    if (window.confirm('⚠️ Are you sure you want to DELETE ALL MASTER DATA? This cannot be undone!')) {
      try {
        clearAllMasterData();
        showMessage('success', '✅ All master data cleared successfully!');
        onDataChange?.();
      } catch (error) {
        showMessage('error', '❌ Failed to clear data');
      }
    }
  };

  // Clear all bookings
  const handleClearAllBookings = () => {
    if (window.confirm('⚠️ Are you sure you want to DELETE ALL BOOKINGS/RESERVATIONS? This cannot be undone!')) {
      try {
        localStorage.removeItem('banquet_bookings');
        showMessage('success', '✅ All bookings cleared successfully!');
        onDataChange?.();
      } catch (error) {
        showMessage('error', '❌ Failed to clear bookings');
      }
    }
  };

  // Export data
  const handleExportData = () => {
    try {
      const data = exportAllMasterData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `venueops-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', '✅ Data exported successfully!');
    } catch (error) {
      showMessage('error', '❌ Failed to export data');
    }
  };

  // Import data
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            if (window.confirm('⚠️ This will REPLACE all existing data. Continue?')) {
              importAllMasterData(data);
              showMessage('success', '✅ Data imported successfully!');
              onDataChange?.();
            }
          } catch (error) {
            showMessage('error', '❌ Invalid JSON file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Get current data stats
  const getDataStats = () => {
    const venues = venueDataStore.getVenues([]);
    const primeSpaces = primeSpaceDataStore.getPrimeSpaces([]);
    const subSpaces = subSpaceDataStore.getSubSpaces([]);
    const layouts = layoutDataStore.getLayouts([]);

    return {
      venues: venues.length,
      primeSpaces: primeSpaces.length,
      subSpaces: subSpaces.length,
      layouts: layouts.length,
    };
  };

  const stats = getDataStats();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg bg-purple-600 text-white hover:bg-purple-700 border-purple-700"
        >
          <FlaskConical className="size-4 mr-2" />
          Testing Tools
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-purple-600" />
            Testing Control Panel
          </DialogTitle>
          <DialogDescription>
            Generate sample data, export/import backups, and manage test scenarios
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div
            className={`p-3 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data">Data Generation</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            <TabsTrigger value="stats">Current Data</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="size-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Quick Data Generation</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Instantly populate the system with realistic test data
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="size-4 text-green-600" />
                      Full Sample Data Set
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete dataset with 3 venues, 8 prime spaces, 14 sub spaces, and layouts
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">3 Venues</Badge>
                      <Badge variant="secondary">8 Prime Spaces</Badge>
                      <Badge variant="secondary">14 Sub Spaces</Badge>
                    </div>
                  </div>
                  <Button onClick={generateSampleData} className="ml-4">
                    Generate
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Database className="size-4 text-blue-600" />
                      Minimal Test Data
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Basic dataset with 1 venue, 1 prime space, 1 sub space
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">1 Venue</Badge>
                      <Badge variant="outline">1 Prime Space</Badge>
                      <Badge variant="outline">1 Sub Space</Badge>
                    </div>
                  </div>
                  <Button onClick={generateMinimalData} variant="outline" className="ml-4">
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">Clear All Data</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Delete all master setup data (cannot be undone)
                    </p>
                  </div>
                </div>
                <Button onClick={handleClearAllData} variant="destructive" className="ml-4">
                  <Trash2 className="size-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">Clear All Bookings</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Delete all bookings/reservations (cannot be undone)
                    </p>
                  </div>
                </div>
                <Button onClick={handleClearAllBookings} variant="destructive" className="ml-4">
                  <Trash2 className="size-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Settings className="size-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Backup & Restore</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Save your current data or restore from a backup file
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Download className="size-4 text-green-600" />
                      Export Data Backup
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Download all master setup data as JSON file
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      File name: venueops-backup-{new Date().toISOString().split('T')[0]}.json
                    </p>
                  </div>
                  <Button onClick={handleExportData} variant="outline" className="ml-4">
                    <Download className="size-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Upload className="size-4 text-blue-600" />
                      Import Data Backup
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Restore data from a previously exported JSON file
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Warning: This will replace all current data
                    </p>
                  </div>
                  <Button onClick={handleImportData} variant="outline" className="ml-4">
                    <Upload className="size-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Current Data Statistics</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Overview of data currently stored in the system
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-3xl font-bold text-blue-900">{stats.venues}</div>
                <div className="text-sm text-blue-700 mt-1">Venues</div>
              </div>
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-3xl font-bold text-purple-900">{stats.primeSpaces}</div>
                <div className="text-sm text-purple-700 mt-1">Prime Spaces</div>
              </div>
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-3xl font-bold text-green-900">{stats.subSpaces}</div>
                <div className="text-sm text-green-700 mt-1">Sub Spaces</div>
              </div>
              <div className="border rounded-lg p-4 bg-amber-50">
                <div className="text-3xl font-bold text-amber-900">{stats.layouts}</div>
                <div className="text-sm text-amber-700 mt-1">Layouts</div>
              </div>
            </div>

            {stats.venues === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  📝 No data found. Use the "Data Generation" tab to populate the system with test data.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={onDataChange}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="size-4 mr-2" />
                Refresh Stats
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}