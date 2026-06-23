import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ArrowRightLeft, Package } from 'lucide-react';
import { StoreLocation, PurchaseItem, StoreMaster, StoreStock, StockTransfer, StockTransferItem } from '../kitchen/types';
import { toast } from 'sonner';
import { buildAssignableStoreOptions, getStoreDisplayName } from '../../lib/storeMaster';

interface StockTransferDialogProps {
  open: boolean;
  onClose: () => void;
  stores: StoreMaster[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onTransferCreate: (transfer: StockTransfer) => void;
  userName: string;
}

export function StockTransferDialog({
  open,
  onClose,
  stores,
  purchaseItems,
  storeStocks,
  onStoreStocksChange,
  onTransferCreate,
  userName,
}: StockTransferDialogProps) {
  const [fromStore, setFromStore] = useState<StoreLocation>('');
  const [toStore, setToStore] = useState<StoreLocation>('');
  const [items, setItems] = useState<StockTransferItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const storeOptions = useMemo(() => buildAssignableStoreOptions(stores), [stores]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (storeOptions.length === 0) {
      setFromStore('');
      setToStore('');
      return;
    }

    if (!storeOptions.some((store) => store.id === fromStore)) {
      setFromStore(storeOptions[0].id);
    }

    if (!storeOptions.some((store) => store.id === toStore)) {
      setToStore(storeOptions[1]?.id || storeOptions[0].id);
    }
  }, [fromStore, open, storeOptions, toStore]);

  if (!open) return null;

  const availableItems = storeStocks
    .filter(s => s.storeLocation === fromStore && s.currentStock > 0)
    .map(s => {
      const item = purchaseItems.find(p => p.id === s.purchaseItemId);
      return {
        ...s,
        item,
      };
    });

  const handleAddItem = () => {
    if (availableItems.length === 0) {
      toast.error('No items available in selected store');
      return;
    }

    const firstAvailable = availableItems[0];
    setItems([
      ...items,
      {
        purchaseItemId: firstAvailable.purchaseItemId,
        itemName: firstAvailable.itemName,
        quantity: 0,
        unit: firstAvailable.unit,
        status: 'pending',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof StockTransferItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If item changed, update the name and unit
    if (field === 'purchaseItemId') {
      const selectedStock = availableItems.find(s => s.purchaseItemId === value);
      if (selectedStock) {
        newItems[index].itemName = selectedStock.itemName;
        newItems[index].unit = selectedStock.unit;
        newItems[index].quantity = 0;
      }
    }

    setItems(newItems);
  };

  const getAvailableQuantity = (purchaseItemId: string): number => {
    const stock = storeStocks.find(
      s => s.storeLocation === fromStore && s.purchaseItemId === purchaseItemId
    );
    return stock?.currentStock || 0;
  };

  const handleSubmit = () => {
    if (!fromStore || !toStore) {
      toast.error('Create store and sub-store master entries before posting stock transfers');
      return;
    }

    // Validation
    if (fromStore === toStore) {
      toast.error('Source and destination stores must be different');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item to transfer');
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`Please enter valid quantity for ${item.itemName}`);
        return;
      }

      const available = getAvailableQuantity(item.purchaseItemId);
      if (item.quantity > available) {
        toast.error(`Insufficient stock for ${item.itemName}. Available: ${available} ${item.unit}`);
        return;
      }
    }

    // Generate transfer number
    const transferNumber = `STR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const transfer: StockTransfer = {
      id: `transfer-${Date.now()}`,
      transferNumber,
      transferDate: new Date(),
      fromStore,
      toStore,
      items: items.map((item) => ({ ...item, status: 'received' })),
      status: 'received',
      issuedBy: userName,
      receivedBy: userName,
      receivedAt: new Date(),
      remarks,
      createdAt: new Date(),
    };

    const updatedStoreStocks = [...storeStocks];

    items.forEach((item) => {
      const sourceIndex = updatedStoreStocks.findIndex(
        (stock) => stock.storeLocation === fromStore && stock.purchaseItemId === item.purchaseItemId,
      );

      if (sourceIndex >= 0) {
        updatedStoreStocks[sourceIndex] = {
          ...updatedStoreStocks[sourceIndex],
          currentStock: updatedStoreStocks[sourceIndex].currentStock - item.quantity,
          lastUpdated: new Date(),
        };
      }

      const destinationIndex = updatedStoreStocks.findIndex(
        (stock) => stock.storeLocation === toStore && stock.purchaseItemId === item.purchaseItemId,
      );

      if (destinationIndex >= 0) {
        updatedStoreStocks[destinationIndex] = {
          ...updatedStoreStocks[destinationIndex],
          currentStock: updatedStoreStocks[destinationIndex].currentStock + item.quantity,
          lastUpdated: new Date(),
        };
        return;
      }

      const sourceStock = storeStocks.find(
        (stock) => stock.storeLocation === fromStore && stock.purchaseItemId === item.purchaseItemId,
      );

      updatedStoreStocks.push({
        storeLocation: toStore,
        purchaseItemId: item.purchaseItemId,
        itemName: item.itemName,
        currentStock: item.quantity,
        unit: sourceStock?.unit || item.unit,
        reorderLevel: sourceStock?.reorderLevel || 0,
        lastUpdated: new Date(),
      });
    });

    onStoreStocksChange(updatedStoreStocks);
    onTransferCreate(transfer);
    
    toast.success('Transfer Posted!', {
      description: `Transfer ${transferNumber} moved stock from ${getStoreDisplayName(stores, fromStore)} to ${getStoreDisplayName(stores, toStore)}.`,
    });

    // Reset form
    setItems([]);
    setRemarks('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="size-6 text-blue-600" />
              New Stock Transfer
            </h2>
            <p className="text-sm text-gray-600 mt-1">Transfer items between store locations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Store Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Store <span className="text-red-500">*</span>
              </label>
              <select
                value={fromStore}
                onChange={(e) => {
                  setFromStore(e.target.value as StoreLocation);
                  setItems([]); // Clear items when source changes
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {storeOptions.map(store => (
                  <option key={store.id} value={store.id}>{store.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Store <span className="text-red-500">*</span>
              </label>
              <select
                value={toStore}
                onChange={(e) => setToStore(e.target.value as StoreLocation)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {storeOptions.map(store => (
                  <option key={store.id} value={store.id}>{store.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Items to Transfer <span className="text-red-500">*</span>
              </label>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="size-4" />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
                <Package className="size-12 text-gray-300 mx-auto mb-2" />
                <p className="font-medium">No items added</p>
                <p className="text-sm">Click "Add Item" to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const availableQty = getAvailableQuantity(item.purchaseItemId);
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                          <select
                            value={item.purchaseItemId}
                            onChange={(e) => handleItemChange(index, 'purchaseItemId', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            {availableItems.map(stock => (
                              <option key={stock.purchaseItemId} value={stock.purchaseItemId}>
                                {stock.itemName} (Available: {stock.currentStock} {stock.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            max={availableQty}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            readOnly
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                          />
                        </div>

                        <div className="col-span-2 flex items-end">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-1"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {item.quantity > availableQty && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Insufficient stock. Available: {availableQty} {item.unit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this transfer..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {items.length} item(s) to transfer
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={items.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
