import { useState, useMemo } from 'react';
import { Package, TrendingDown, Search, Filter, Download, ArrowRightLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { PurchaseItem, StoreLocation, StoreStock, StockTransfer } from '../kitchen/types';
import { formatCurrencyPKR, formatDatePK, formatNumberPK } from '../../lib/locale';

interface StoreManagementProps {
  userName: string;
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  stockTransfers: StockTransfer[];
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onStockTransfersChange: (transfers: StockTransfer[]) => void;
  onInitiateTransfer: () => void;
}

const storeLocations: { id: StoreLocation; name: string; icon: string }[] = [
  { id: 'main-store', name: 'Main Store', icon: '🏪' },
  { id: 'main-cold-store', name: 'Main Cold Store', icon: '❄️' },
  { id: 'main-dry-store', name: 'Main Dry Store', icon: '📦' },
  { id: 'hot-kitchen', name: 'Hot Kitchen', icon: '🔥' },
  { id: 'cold-kitchen', name: 'Cold Kitchen', icon: '🧊' },
  { id: 'tandoor', name: 'Tandoor', icon: '🫓' },
  { id: 'bbq', name: 'BBQ Station', icon: '🍖' },
  { id: 'restaurant-kitchen', name: 'Restaurant Kitchen', icon: '🍽️' },
  { id: 'bar', name: 'Bar', icon: '🍹' },
  { id: 'pastry-section', name: 'Pastry Section', icon: '🍰' },
];

export function StoreManagement({
  userName,
  purchaseItems,
  storeStocks,
  stockTransfers,
  onStoreStocksChange,
  onStockTransfersChange,
  onInitiateTransfer,
}: StoreManagementProps) {
  const [selectedStore, setSelectedStore] = useState<StoreLocation>('main-store');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Get current store data
  const currentStoreStocks = useMemo(() => {
    let stocks = storeStocks.filter(s => s.storeLocation === selectedStore);
    
    if (searchQuery) {
      stocks = stocks.filter(s => 
        s.itemName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (showLowStockOnly) {
      stocks = stocks.filter(s => s.currentStock <= s.reorderLevel);
    }
    
    return stocks.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [storeStocks, selectedStore, searchQuery, showLowStockOnly]);

  // Calculate store metrics
  const storeMetrics = useMemo(() => {
    const stocks = storeStocks.filter(s => s.storeLocation === selectedStore);
    const totalItems = stocks.length;
    const lowStockItems = stocks.filter(s => s.currentStock <= s.reorderLevel).length;
    const outOfStockItems = stocks.filter(s => s.currentStock === 0).length;
    const totalValue = stocks.reduce((sum, s) => {
      const item = purchaseItems.find(i => i.id === s.purchaseItemId);
      return sum + (s.currentStock * (item?.lastPurchaseRate || 0));
    }, 0);
    
    return { totalItems, lowStockItems, outOfStockItems, totalValue };
  }, [storeStocks, selectedStore, purchaseItems]);

  // Recent transfers
  const recentTransfers = useMemo(() => {
    return stockTransfers
      .filter(t => t.fromStore === selectedStore || t.toStore === selectedStore)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [stockTransfers, selectedStore]);

  const getStockLevelColor = (current: number, reorder: number) => {
    const percentage = (current / reorder) * 100;
    if (current === 0) return 'text-red-700';
    if (percentage <= 50) return 'text-red-600';
    if (percentage <= 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockLevelBadge = (current: number, reorder: number) => {
    const percentage = (current / reorder) * 100;
    if (current === 0) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Out of Stock</span>;
    if (percentage <= 50) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Critical</span>;
    if (percentage <= 100) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Low</span>;
    if (percentage <= 150) return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Normal</span>;
    return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Healthy</span>;
  };

  const getTransferStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Pending</span>;
      case 'in-transit':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">In Transit</span>;
      case 'received':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Received</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Metrics */}
      <div className="bg-white border-b p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store Management</h2>
            <p className="text-sm text-gray-600 mt-1">Monitor inventory across all store locations</p>
          </div>
          <button
            onClick={onInitiateTransfer}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <ArrowRightLeft className="size-4" />
            New Transfer
          </button>
        </div>

        {/* Store Location Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {storeLocations.map(store => {
            const stocksInStore = storeStocks.filter(s => s.storeLocation === store.id);
            const lowStock = stocksInStore.filter(s => s.currentStock <= s.reorderLevel).length;
            
            return (
              <button
                key={store.id}
                onClick={() => setSelectedStore(store.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all whitespace-nowrap ${
                  selectedStore === store.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{store.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-sm">{store.name}</p>
                  <p className={`text-xs ${selectedStore === store.id ? 'text-blue-100' : 'text-gray-500'}`}>
                    {stocksInStore.length} items
                    {lowStock > 0 && <span className="ml-1">• {lowStock} low</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-5 text-blue-600" />
              <p className="text-sm text-blue-900 font-medium">Total Items</p>
            </div>
            <p className="text-3xl font-bold text-blue-900">{storeMetrics.totalItems}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="size-5 text-yellow-600" />
              <p className="text-sm text-yellow-900 font-medium">Low Stock</p>
            </div>
            <p className="text-3xl font-bold text-yellow-900">{storeMetrics.lowStockItems}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-5 text-red-600" />
              <p className="text-sm text-red-900 font-medium">Out of Stock</p>
            </div>
            <p className="text-3xl font-bold text-red-900">{storeMetrics.outOfStockItems}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-5 text-green-600" />
              <p className="text-sm text-green-900 font-medium">Stock Value</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatCurrencyPKR(storeMetrics.totalValue, { compact: true })}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock List */}
        <div className="lg:col-span-2 bg-white rounded-lg border flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                  showLowStockOnly
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="size-4" />
                Low Stock Only
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                <Download className="size-4" />
                Export
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {currentStoreStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                <Package className="size-16 text-gray-300 mb-4" />
                <p className="font-medium">No items found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'No stock in this location'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Current Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Reorder Level</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentStoreStocks.map((stock) => {
                    const item = purchaseItems.find(i => i.id === stock.purchaseItemId);
                    const value = stock.currentStock * (item?.lastPurchaseRate || 0);
                    
                    return (
                      <tr key={`${stock.storeLocation}-${stock.purchaseItemId}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{stock.itemName}</p>
                              <p className="text-xs text-gray-500">Updated: {formatDatePK(stock.lastUpdated)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className={`font-bold ${getStockLevelColor(stock.currentStock, stock.reorderLevel)}`}>
                              {formatNumberPK(stock.currentStock)} {stock.unit}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <p className="text-gray-700">{formatNumberPK(stock.reorderLevel)} {stock.unit}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStockLevelBadge(stock.currentStock, stock.reorderLevel)}
                        </td>
                        <td className="px-4 py-3 text-right">
                                <p className="font-semibold text-gray-900">{formatCurrencyPKR(value)}</p>
                          {item?.lastPurchaseRate && (
                                <p className="text-xs text-gray-500">@{formatCurrencyPKR(item.lastPurchaseRate ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{stock.unit}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="bg-white rounded-lg border flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="size-5 text-blue-600" />
                Recent Transfers
              </h3>
              <span className="text-xs text-gray-500">{recentTransfers.length} transfers</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {recentTransfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                <ArrowRightLeft className="size-12 text-gray-300 mb-2" />
                <p className="text-sm">No transfers yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {recentTransfers.map(transfer => (
                  <div key={transfer.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{transfer.transferNumber}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <span className="font-medium">
                            {storeLocations.find(s => s.id === transfer.fromStore)?.name}
                          </span>
                          <ArrowRightLeft className="size-3" />
                          <span className="font-medium">
                            {storeLocations.find(s => s.id === transfer.toStore)?.name}
                          </span>
                        </div>
                      </div>
                      {getTransferStatusBadge(transfer.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{transfer.items.length} items</span>
                              <span>{formatDatePK(transfer.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
