import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, Package, Receipt, Warehouse, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyPKR, formatDatePK } from '../../lib/locale';
import { buildAssignableStoreOptions, getStoreDisplayName } from '../../lib/storeMaster';
import {
  GoodsReceipt,
  GoodsReceiptItem,
  PurchaseItem,
  PurchaseOrder,
  StoreLocation,
  StoreMaster,
  StoreStock,
  Vendor,
  VendorBill,
  VendorBillItem,
} from '../kitchen/types';

interface GRNDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onGRNCreate: (grn: GoodsReceipt, updatedPO: PurchaseOrder) => void;
  stores: StoreMaster[];
  purchaseItems: PurchaseItem[];
  storeStocks: StoreStock[];
  vendors: Vendor[];
  vendorBills: VendorBill[];
  onPurchaseItemsChange: (items: PurchaseItem[]) => void;
  onStoreStocksChange: (stocks: StoreStock[]) => void;
  onVendorsChange: (vendors: Vendor[]) => void;
  onVendorBillsChange: (bills: VendorBill[]) => void;
  userName: string;
}

const tableHeadClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600';
const tableCellClass = 'px-3 py-2 text-sm text-slate-700 align-middle';

const formatTerms = (value: string) => value.replace(/-/g, ' ');
const getPrimaryAssignedKitchenStore = (purchaseItem?: PurchaseItem | null) =>
  purchaseItem?.assignedKitchenStoreIds?.[0] || purchaseItem?.storeLocation || '';
const getPurchaseItemBaseUnit = (purchaseItem: PurchaseItem) => purchaseItem.baseUnitId || purchaseItem.issueUnit;

export function GRNDialog({
  open,
  onClose,
  purchaseOrder,
  onGRNCreate,
  stores,
  purchaseItems,
  storeStocks,
  vendors,
  vendorBills,
  onPurchaseItemsChange,
  onStoreStocksChange,
  onVendorsChange,
  onVendorBillsChange,
  userName,
}: GRNDialogProps) {
  const [defaultDestinationStore, setDefaultDestinationStore] = useState<StoreLocation>('');
  const [items, setItems] = useState<GoodsReceiptItem[]>([]);
  const [qualityRemarks, setQualityRemarks] = useState('');
  const [createVendorBill, setCreateVendorBill] = useState(true);
  const [closeOutstandingBalance, setCloseOutstandingBalance] = useState(false);

  const storeOptions = useMemo(() => buildAssignableStoreOptions(stores), [stores]);
  const previousReceivedQuantities = purchaseOrder?.receivedQuantities ?? {};

  useEffect(() => {
    if (!open || !purchaseOrder) {
      setItems([]);
      setQualityRemarks('');
      setCreateVendorBill(true);
      setCloseOutstandingBalance(false);
      return;
    }

    const initialItems: GoodsReceiptItem[] = purchaseOrder.items
      .map((poItem) => {
        const linkedPurchaseItem = purchaseItems.find((entry) => entry.id === poItem.purchaseItemId);
        const alreadyReceived = poItem.receivedQuantity ?? previousReceivedQuantities[poItem.purchaseItemId] ?? 0;
        const alreadyClosed = poItem.closedQuantity ?? 0;
        const pendingQuantity = Math.max(0, poItem.quantity - alreadyReceived - alreadyClosed);

        return {
          purchaseItemId: poItem.purchaseItemId,
          itemName: poItem.itemName,
          orderedQuantity: pendingQuantity,
          receivedQuantity: pendingQuantity,
          acceptedQuantity: pendingQuantity,
          rejectedQuantity: 0,
          unit: poItem.unit,
          ratePerUnit: poItem.ratePerUnit,
          totalValue: pendingQuantity * poItem.ratePerUnit,
          destinationStore: getPrimaryAssignedKitchenStore(linkedPurchaseItem) || storeOptions[0]?.id || '',
        };
      })
      .filter((item) => item.orderedQuantity > 0);

    setItems(initialItems);
    setDefaultDestinationStore(initialItems[0]?.destinationStore || storeOptions[0]?.id || '');
    setQualityRemarks('');
    setCreateVendorBill(true);
    setCloseOutstandingBalance(false);
  }, [open, previousReceivedQuantities, purchaseItems, purchaseOrder, storeOptions]);

  if (!open || !purchaseOrder) {
    return null;
  }

  const vendor = vendors.find((entry) => entry.id === purchaseOrder.vendorId) || null;
  const totalPreviouslyClosed = purchaseOrder.items.reduce((sum, item) => sum + (item.closedQuantity ?? 0), 0);

  const totalOrderedOnPO = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPreviouslyReceived = purchaseOrder.items.reduce(
    (sum, item) => sum + (item.receivedQuantity ?? previousReceivedQuantities[item.purchaseItemId] ?? 0),
    0,
  );

  const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalAccepted = items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  const totalRejected = items.reduce((sum, item) => sum + item.rejectedQuantity, 0);
  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
  const acceptedLineCount = items.filter((item) => item.acceptedQuantity > 0).length;
  const projectedOutstandingAfterThisGRN = purchaseOrder.items.reduce((sum, poItem) => {
    const alreadyReceived = poItem.receivedQuantity ?? previousReceivedQuantities[poItem.purchaseItemId] ?? 0;
    const alreadyClosed = poItem.closedQuantity ?? 0;
    const receivedNow = items.find((item) => item.purchaseItemId === poItem.purchaseItemId)?.acceptedQuantity ?? 0;
    const nextReceived = Math.min(poItem.quantity, alreadyReceived + receivedNow);
    return sum + Math.max(poItem.quantity - nextReceived - alreadyClosed, 0);
  }, 0);
  const projectedCloseQuantity = closeOutstandingBalance ? projectedOutstandingAfterThisGRN : 0;

  const calculateQualityStatus = (): 'approved' | 'rejected' | 'partial' => {
    const hasRejections = items.some((item) => item.rejectedQuantity > 0);
    const allRejected = items.every((item) => item.acceptedQuantity === 0);

    if (allRejected) {
      return 'rejected';
    }
    if (hasRejections) {
      return 'partial';
    }
    return 'approved';
  };

  const qualityStatus = calculateQualityStatus();

  const postingPlan = useMemo(
    () =>
      items
        .filter((item) => item.acceptedQuantity > 0 && item.destinationStore)
        .reduce(
          (acc, item) => {
            const linkedPurchaseItem = purchaseItems.find((purchaseItem) => purchaseItem.id === item.purchaseItemId);
            const issueUnitQty = item.acceptedQuantity * (linkedPurchaseItem?.conversionFactor || 1);
            const unit = linkedPurchaseItem ? getPurchaseItemBaseUnit(linkedPurchaseItem) : item.unit;
            const key = item.destinationStore;

            if (!acc[key]) {
              acc[key] = {
                storeId: key,
                lineCount: 0,
                acceptedValue: 0,
                quantityInIssueUnit: 0,
                unit,
              };
            }

            acc[key].lineCount += 1;
            acc[key].acceptedValue += item.totalValue;
            acc[key].quantityInIssueUnit += issueUnitQty;
            acc[key].unit = unit;
            return acc;
          },
          {} as Record<
            string,
            {
              storeId: StoreLocation;
              lineCount: number;
              acceptedValue: number;
              quantityInIssueUnit: number;
              unit: string;
            }
          >,
        ),
    [items, purchaseItems],
  );

  const postingPlanRows = useMemo(
    () =>
      Object.values(postingPlan).sort((left, right) => {
        if (left.lineCount !== right.lineCount) {
          return right.lineCount - left.lineCount;
        }
        return right.acceptedValue - left.acceptedValue;
      }),
    [postingPlan],
  );

  const vendorOpenBills = useMemo(
    () =>
      vendorBills.filter(
        (bill) =>
          bill.vendorId === purchaseOrder.vendorId &&
          bill.status !== 'paid' &&
          bill.status !== 'cancelled',
      ),
    [purchaseOrder.vendorId, vendorBills],
  );

  const billPreview = useMemo(() => {
    const billDate = new Date();
    const dueDate = new Date(billDate);
    const creditDays =
      vendor?.paymentTerms.startsWith('credit-') ? Number(vendor.paymentTerms.split('-')[1] || '0') : 0;

    if (creditDays > 0) {
      dueDate.setDate(dueDate.getDate() + creditDays);
    }

    return {
      billDate,
      dueDate,
      creditDays,
    };
  }, [vendor]);

  const lineStockContext = useMemo(
    () =>
      items.map((item) => {
        const purchaseItem = purchaseItems.find((entry) => entry.id === item.purchaseItemId);
        const destinationStore = item.destinationStore;
        const currentDestinationStock =
          storeStocks.find(
            (stock) => stock.purchaseItemId === item.purchaseItemId && stock.storeLocation === destinationStore,
          )?.currentStock || 0;

        return {
          ...item,
          purchaseItem,
          currentDestinationStock,
        };
      }),
    [items, purchaseItems, storeStocks],
  );

  const handleReceivedQuantityChange = (index: number, value: number) => {
    const nextItems = [...items];
    const item = nextItems[index];
    const receivedQuantity = Math.max(0, Math.min(value, item.orderedQuantity));

    item.receivedQuantity = receivedQuantity;
    if (item.acceptedQuantity === item.orderedQuantity || item.acceptedQuantity > receivedQuantity) {
      item.acceptedQuantity = receivedQuantity;
      item.rejectedQuantity = 0;
    }

    item.totalValue = item.acceptedQuantity * item.ratePerUnit;
    setItems(nextItems);
  };

  const handleAcceptedQuantityChange = (index: number, value: number) => {
    const nextItems = [...items];
    const item = nextItems[index];
    const acceptedQuantity = Math.max(0, Math.min(value, item.receivedQuantity));

    item.acceptedQuantity = acceptedQuantity;
    item.rejectedQuantity = item.receivedQuantity - acceptedQuantity;
    item.totalValue = acceptedQuantity * item.ratePerUnit;
    setItems(nextItems);
  };

  const handleRateChange = (index: number, value: number) => {
    const nextItems = [...items];
    const item = nextItems[index];
    const ratePerUnit = Math.max(value, 0);

    item.ratePerUnit = ratePerUnit;
    item.totalValue = item.acceptedQuantity * ratePerUnit;
    setItems(nextItems);
  };

  const handleStoreChange = (index: number, destinationStore: StoreLocation) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...nextItems[index],
      destinationStore,
    };
    setItems(nextItems);
  };

  const handleApplyStoreToAll = (destinationStore: StoreLocation) => {
    setDefaultDestinationStore(destinationStore);
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        destinationStore,
      })),
    );
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error('This purchase order has no pending quantities to receive');
      return;
    }

    const hasInvalidQuantities = items.some(
      (item) =>
        item.receivedQuantity < 0 ||
        item.acceptedQuantity < 0 ||
        item.acceptedQuantity > item.receivedQuantity ||
        item.receivedQuantity > item.orderedQuantity,
    );

    if (hasInvalidQuantities) {
      toast.error('Please enter valid quantities for all items');
      return;
    }

    const hasMissingStore = items.some((item) => item.acceptedQuantity > 0 && !item.destinationStore);
    if (hasMissingStore) {
      toast.error('Please assign a destination store for every accepted line item');
      return;
    }

    const hasMissingRate = items.some((item) => item.acceptedQuantity > 0 && item.ratePerUnit <= 0);
    if (hasMissingRate) {
      toast.error('Enter a valid rate for every accepted line before posting the GRN');
      return;
    }

    if ((totalRejected > 0 || (closeOutstandingBalance && projectedOutstandingAfterThisGRN > 0)) && !qualityRemarks.trim()) {
      toast.error('Please add remarks for rejected or short-closed quantities');
      return;
    }

    const grnNumber = `GRN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    const activeStores = Array.from(
      new Set(
        items
          .filter((item) => item.acceptedQuantity > 0)
          .map((item) => item.destinationStore)
          .filter((store): store is StoreLocation => Boolean(store)),
      ),
    );
    const primaryDestinationStore = activeStores[0] || defaultDestinationStore;

    const grn: GoodsReceipt = {
      id: `grn-${Date.now()}`,
      grnNumber,
      purchaseOrderId: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      vendorId: purchaseOrder.vendorId,
      vendorName: purchaseOrder.vendorName,
      receiptDate: new Date(),
      items,
      destinationStore: primaryDestinationStore,
      qualityCheckStatus: qualityStatus,
      qualityCheckedBy: userName,
      qualityRemarks,
      receivedBy: userName,
      createdAt: new Date(),
    };

    const nextReceivedQuantities = purchaseOrder.items.reduce((acc, poItem) => {
      const alreadyReceived = poItem.receivedQuantity ?? previousReceivedQuantities[poItem.purchaseItemId] ?? 0;
      const receivedNow = items.find((item) => item.purchaseItemId === poItem.purchaseItemId)?.acceptedQuantity ?? 0;
      acc[poItem.purchaseItemId] = Math.min(poItem.quantity, alreadyReceived + receivedNow);
      return acc;
    }, {} as Record<string, number>);
    const nextClosedQuantities = purchaseOrder.items.reduce((acc, poItem) => {
      const alreadyClosed = poItem.closedQuantity ?? 0;
      const nextReceived = nextReceivedQuantities[poItem.purchaseItemId] ?? 0;
      const remainingOpen = Math.max(poItem.quantity - nextReceived - alreadyClosed, 0);
      acc[poItem.purchaseItemId] = alreadyClosed + (closeOutstandingBalance ? remainingOpen : 0);
      return acc;
    }, {} as Record<string, number>);

    const allFullyReceived = purchaseOrder.items.every(
      (poItem) => (nextReceivedQuantities[poItem.purchaseItemId] ?? 0) >= poItem.quantity,
    );
    const allResolved = purchaseOrder.items.every(
      (poItem) =>
        (nextReceivedQuantities[poItem.purchaseItemId] ?? 0) +
          (nextClosedQuantities[poItem.purchaseItemId] ?? 0) >=
        poItem.quantity,
    );
    const someResolved = purchaseOrder.items.some(
      (poItem) =>
        (nextReceivedQuantities[poItem.purchaseItemId] ?? 0) +
          (nextClosedQuantities[poItem.purchaseItemId] ?? 0) >
        0,
    );
    const shortClosedNow = purchaseOrder.items.some(
      (poItem) => (nextClosedQuantities[poItem.purchaseItemId] ?? 0) > (poItem.closedQuantity ?? 0),
    );

    let newPOStatus: PurchaseOrder['status'] = purchaseOrder.status;
    if (allFullyReceived) {
      newPOStatus = 'received';
    } else if (allResolved) {
      newPOStatus = 'closed';
    } else if (someResolved) {
      newPOStatus = 'partially-received';
    }

    const updatedItems = purchaseOrder.items.map((poItem) => {
      const grnItem = items.find((item) => item.purchaseItemId === poItem.purchaseItemId);
      const receivedQuantity = nextReceivedQuantities[poItem.purchaseItemId] ?? 0;
      const closedQuantity = nextClosedQuantities[poItem.purchaseItemId] ?? 0;
      const ratePerUnit = grnItem && grnItem.ratePerUnit > 0 ? grnItem.ratePerUnit : poItem.ratePerUnit;
      const committedQuantity = Math.max(poItem.quantity - closedQuantity, 0);

      return {
        ...poItem,
        ratePerUnit,
        amount: committedQuantity * ratePerUnit,
        receivedQuantity,
        closedQuantity,
        pendingQuantity: Math.max(0, poItem.quantity - receivedQuantity - closedQuantity),
      };
    });
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = subtotal + (purchaseOrder.taxAmount || 0);
    const amountPaid = purchaseOrder.amountPaid || 0;
    const updatedPO: PurchaseOrder = {
      ...purchaseOrder,
      status: newPOStatus,
      items: updatedItems,
      subtotal,
      totalAmount,
      amountPending: Math.max(totalAmount - amountPaid, 0),
      deliveredDate: allResolved ? new Date() : purchaseOrder.deliveredDate,
      receivedBy: someResolved ? userName : purchaseOrder.receivedBy,
      receivedQuantities: nextReceivedQuantities,
      shortClosedAt: shortClosedNow ? new Date() : purchaseOrder.shortClosedAt,
      shortClosedBy: shortClosedNow ? userName : purchaseOrder.shortClosedBy,
      shortCloseReason:
        shortClosedNow && qualityRemarks.trim()
          ? qualityRemarks.trim()
          : shortClosedNow
            ? 'Balance short closed during GRN receipt'
            : purchaseOrder.shortCloseReason,
      updatedAt: new Date(),
    };

    const updatedPurchaseItems = purchaseItems.map((purchaseItem) => {
      const receivedItem = items.find((item) => item.purchaseItemId === purchaseItem.id);
      if (!receivedItem || receivedItem.acceptedQuantity <= 0) {
        return purchaseItem;
      }

      const conversionFactor = purchaseItem.conversionFactor || 1;
      const acceptedInIssueUnit = receivedItem.acceptedQuantity * conversionFactor;
      const previousStock = purchaseItem.currentStock || 0;
      const previousAverageCost =
        purchaseItem.averageCost ?? purchaseItem.ratePerUnit ?? (purchaseItem.lastPurchaseRate || 0) / conversionFactor;
      const receivedCostPerBaseUnit = receivedItem.ratePerUnit / conversionFactor;
      const averageCost =
        previousStock + acceptedInIssueUnit > 0
          ? ((previousStock * previousAverageCost) + (acceptedInIssueUnit * receivedCostPerBaseUnit)) /
            (previousStock + acceptedInIssueUnit)
          : receivedCostPerBaseUnit;

      return {
        ...purchaseItem,
        currentStock: purchaseItem.currentStock + acceptedInIssueUnit,
        lastPurchaseRate: receivedItem.ratePerUnit,
        lastCost: receivedItem.ratePerUnit,
        averageCost,
        ratePerUnit: averageCost,
        lastPurchaseDate: new Date(),
        updatedAt: new Date(),
      };
    });

    const stockPostings = items
      .map((receivedItem) => {
        if (receivedItem.acceptedQuantity <= 0 || !receivedItem.destinationStore) {
          return null;
        }

        const linkedPurchaseItem = purchaseItems.find((purchaseItem) => purchaseItem.id === receivedItem.purchaseItemId);
        if (!linkedPurchaseItem) {
          return null;
        }

        return {
          purchaseItemId: receivedItem.purchaseItemId,
          itemName: receivedItem.itemName,
          destinationStore: receivedItem.destinationStore,
          quantityInIssueUnit: receivedItem.acceptedQuantity * linkedPurchaseItem.conversionFactor,
          unit: getPurchaseItemBaseUnit(linkedPurchaseItem),
          reorderLevel: linkedPurchaseItem.reorderLevel,
        };
      })
      .filter((posting): posting is NonNullable<typeof posting> => posting !== null);

    const updatedStoreStocks = [...storeStocks];

    stockPostings.forEach((posting) => {
      const existingStockIndex = updatedStoreStocks.findIndex(
        (stock) =>
          stock.storeLocation === posting.destinationStore &&
          stock.purchaseItemId === posting.purchaseItemId,
      );

      if (existingStockIndex >= 0) {
        updatedStoreStocks[existingStockIndex] = {
          ...updatedStoreStocks[existingStockIndex],
          itemName: posting.itemName,
          currentStock: updatedStoreStocks[existingStockIndex].currentStock + posting.quantityInIssueUnit,
          unit: posting.unit,
          reorderLevel: posting.reorderLevel,
          lastUpdated: new Date(),
        };
        return;
      }

      updatedStoreStocks.push({
        storeLocation: posting.destinationStore,
        purchaseItemId: posting.purchaseItemId,
        itemName: posting.itemName,
        currentStock: posting.quantityInIssueUnit,
        unit: posting.unit,
        reorderLevel: posting.reorderLevel,
        lastUpdated: new Date(),
      });
    });

    const acceptedSubtotal = stockPostings.reduce((sum, posting) => {
      const sourceItem = items.find(
        (entry) =>
          entry.purchaseItemId === posting.purchaseItemId && entry.destinationStore === posting.destinationStore,
      );
      return sum + (sourceItem?.totalValue || 0);
    }, 0);

    const updatedVendors = vendors.map((entry) => {
      if (entry.id !== purchaseOrder.vendorId) {
        return entry;
      }

      return {
        ...entry,
        totalPurchases: entry.totalPurchases + acceptedSubtotal,
        lastPurchaseDate: new Date(),
        currentBalance: createVendorBill ? entry.currentBalance + acceptedSubtotal : entry.currentBalance,
        updatedAt: new Date(),
      };
    });

    let createdVendorBillNumber: string | null = null;

    if (createVendorBill && acceptedSubtotal > 0) {
      const billDate = new Date();
      const dueDate = new Date(billDate);
      const creditDays = vendor?.paymentTerms.startsWith('credit-')
        ? Number(vendor.paymentTerms.split('-')[1] || '0')
        : 0;

      if (creditDays > 0) {
        dueDate.setDate(dueDate.getDate() + creditDays);
      }

      const vendorBillItems: VendorBillItem[] = items
        .filter((item) => item.acceptedQuantity > 0)
        .map((item) => ({
          id: `vendor-bill-item-${Date.now()}-${item.purchaseItemId}`,
          purchaseItemId: item.purchaseItemId,
          itemName: item.itemName,
          quantity: item.acceptedQuantity,
          unit: item.unit,
          ratePerUnit: item.ratePerUnit,
          amount: item.totalValue,
        }));

      createdVendorBillNumber = `BILL-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;

      const newVendorBill: VendorBill = {
        id: `vendor-bill-${Date.now()}`,
        billNumber: createdVendorBillNumber,
        billDate,
        dueDate,
        vendorId: purchaseOrder.vendorId,
        vendorName: purchaseOrder.vendorName,
        purchaseOrderId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        items: vendorBillItems,
        subtotal: acceptedSubtotal,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: acceptedSubtotal,
        amountPaid: 0,
        amountPending: acceptedSubtotal,
        status: 'pending',
        paymentHistory: [],
        remarks: `Generated from ${grnNumber}`,
        createdBy: userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onVendorBillsChange([...vendorBills, newVendorBill]);
    }

    onPurchaseItemsChange(updatedPurchaseItems);
    onStoreStocksChange(updatedStoreStocks);
    onVendorsChange(updatedVendors);
    onGRNCreate(grn, updatedPO);

    const statusMessage =
      qualityStatus === 'approved'
        ? 'All items approved'
        : qualityStatus === 'partial'
          ? 'Some items rejected'
          : 'All items rejected';
    const storeSummary =
      activeStores.length > 0
        ? activeStores.map((store) => getStoreDisplayName(stores, store)).join(', ')
        : getStoreDisplayName(stores, primaryDestinationStore);

    toast.success('GRN Created Successfully!', {
      description: `${grnNumber} - ${statusMessage}. Store stock posted to ${storeSummary}${createdVendorBillNumber ? ` and vendor bill ${createdVendorBillNumber} created.` : '.'}`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200">
          <div className="flex items-start justify-between px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Package className="size-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Goods Receipt Note</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                PO {purchaseOrder.poNumber} | Vendor {purchaseOrder.vendorName}
              </p>
            </div>
            <button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100">
              <X className="size-5" />
            </button>
          </div>

          <div className="border-t border-slate-200 px-5 py-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><strong className="text-slate-900">Pending Lines:</strong> {items.length}</span>
              <span><strong className="text-slate-900">PO Qty:</strong> {totalOrderedOnPO}</span>
              <span><strong className="text-slate-900">Previously Received:</strong> {totalPreviouslyReceived}</span>
              <span><strong className="text-slate-900">Previously Closed:</strong> {totalPreviouslyClosed}</span>
              <span><strong className="text-slate-900">Receiving Now:</strong> {totalReceived}</span>
              <span><strong className="text-slate-900">Accepted:</strong> {totalAccepted}</span>
              <span><strong className="text-slate-900">Rejected:</strong> {totalRejected}</span>
              <span><strong className="text-slate-900">Accepted Value:</strong> {formatCurrencyPKR(totalValue, { compact: true })}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <section className="rounded border border-slate-200">
                <div className="grid gap-4 border-b border-slate-200 px-4 py-3 md:grid-cols-[minmax(0,280px),1fr]">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Apply Store To All Lines</label>
                    <select
                      value={defaultDestinationStore}
                      onChange={(event) => handleApplyStoreToAll(event.target.value as StoreLocation)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    >
                      {storeOptions.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="font-medium">Item-wise store allocation is active.</p>
                        <p className="mt-1 text-xs text-amber-800">
                          Post cold, dry, beverage, and kitchen-bound items to the correct destination so live stock stays reliable for production issue.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={tableHeadClass}>Item</th>
                        <th className={`${tableHeadClass} text-right`}>Pending</th>
                        <th className={`${tableHeadClass} text-right`}>Received</th>
                        <th className={`${tableHeadClass} text-right`}>Accepted</th>
                        <th className={`${tableHeadClass} text-right`}>Rejected</th>
                        <th className={`${tableHeadClass} text-right`}>Rate</th>
                        <th className={tableHeadClass}>Destination</th>
                        <th className={`${tableHeadClass} text-right`}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineStockContext.map((item, index) => (
                        <tr key={`${item.purchaseItemId}-${index}`} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className={tableCellClass}>
                            <div className="font-medium text-slate-900">{item.itemName}</div>
                            <div className="text-xs text-slate-500">
                              {formatCurrencyPKR(item.ratePerUnit)} / {item.unit}
                              {item.purchaseItem ? ` | current ${item.currentDestinationStock} ${getPurchaseItemBaseUnit(item.purchaseItem)}` : ''}
                            </div>
                          </td>
                          <td className={`${tableCellClass} text-right`}>{item.orderedQuantity} {item.unit}</td>
                          <td className={`${tableCellClass} text-right`}>
                            <input
                              type="number"
                              value={item.receivedQuantity}
                              onChange={(event) => handleReceivedQuantityChange(index, parseFloat(event.target.value) || 0)}
                              min="0"
                              max={item.orderedQuantity}
                              className="w-24 rounded border border-slate-300 px-3 py-1.5 text-right text-sm font-medium text-slate-700"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <input
                              type="number"
                              value={item.acceptedQuantity}
                              onChange={(event) => handleAcceptedQuantityChange(index, parseFloat(event.target.value) || 0)}
                              min="0"
                              max={item.receivedQuantity}
                              className="w-24 rounded border border-emerald-300 px-3 py-1.5 text-right text-sm font-medium text-emerald-700"
                            />
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <span className={item.rejectedQuantity > 0 ? 'font-medium text-red-700' : 'text-slate-400'}>
                              {item.rejectedQuantity > 0 ? `${item.rejectedQuantity} ${item.unit}` : '-'}
                            </span>
                          </td>
                          <td className={`${tableCellClass} text-right`}>
                            <input
                              type="number"
                              value={item.ratePerUnit}
                              onChange={(event) => handleRateChange(index, parseFloat(event.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-28 rounded border border-slate-300 px-3 py-1.5 text-right text-sm font-medium text-slate-700"
                            />
                          </td>
                          <td className={tableCellClass}>
                            <select
                              value={item.destinationStore}
                              onChange={(event) => handleStoreChange(index, event.target.value as StoreLocation)}
                              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                            >
                              {storeOptions.map((store) => (
                                <option key={store.id} value={store.id}>
                                  {store.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`${tableCellClass} text-right font-medium text-slate-900`}>
                            {formatCurrencyPKR(item.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="rounded border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-2">
                    <h3 className="text-sm font-semibold text-slate-900">Quality Control</h3>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={qualityRemarks}
                      onChange={(event) => setQualityRemarks(event.target.value)}
                      rows={5}
                      placeholder="Add remarks if any quantity is rejected or partially accepted..."
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                    {totalRejected > 0 ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Rejected quantities require remarks before the GRN can be posted.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Posting Controls</h3>
                  <label className="flex items-start gap-3 rounded border border-slate-200 bg-white px-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={createVendorBill}
                      onChange={(event) => setCreateVendorBill(event.target.checked)}
                      className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">Create Vendor Bill</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        Generate accounts payable from accepted quantities and update vendor outstanding balance.
                      </span>
                    </span>
                  </label>
                  <label className="mt-3 flex items-start gap-3 rounded border border-slate-200 bg-white px-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={closeOutstandingBalance}
                      onChange={(event) => setCloseOutstandingBalance(event.target.checked)}
                      className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">Close Remaining Balance On This PO</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        Use this when the vendor will not deliver the balance. This PO will be treated as complete and you can raise a fresh PO later.
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Outstanding after this GRN: {projectedOutstandingAfterThisGRN} units
                        {closeOutstandingBalance && projectedCloseQuantity > 0 ? ` | ${projectedCloseQuantity} units will be short closed` : ''}
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Receipt className="size-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Receipt Summary</h3>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Received Quantity</span>
                    <span className="font-medium text-slate-900">{totalReceived}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Accepted Quantity</span>
                    <span className="font-medium text-emerald-700">{totalAccepted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rejected Quantity</span>
                    <span className="font-medium text-red-700">{totalRejected}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Short Close Balance</span>
                    <span className="font-medium text-slate-900">{projectedCloseQuantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Accepted Lines</span>
                    <span className="font-medium text-slate-900">{acceptedLineCount}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">Quality Status</span>
                      <span className="font-medium text-slate-900">{qualityStatus}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900">Accepted Value</span>
                      <span className="font-medium text-slate-900">{formatCurrencyPKR(totalValue)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">PO Snapshot</h3>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor</div>
                    <div className="mt-1 font-medium text-slate-900">{purchaseOrder.vendorName}</div>
                    <div className="text-xs text-slate-500">{vendor?.contactPerson || 'No contact'} | {vendor?.phone || 'No phone'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order Date</div>
                      <div className="mt-1">{formatDatePK(purchaseOrder.orderDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected</div>
                      <div className="mt-1">{formatDatePK(purchaseOrder.expectedDeliveryDate)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</div>
                    <div className="mt-1">{formatTerms(purchaseOrder.paymentTerms)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt Position</div>
                    <div className="mt-1">
                      Previously received {totalPreviouslyReceived} of {totalOrderedOnPO}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Warehouse className="size-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Posting Plan</h3>
                </div>
                {postingPlanRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No accepted quantities will be posted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {postingPlanRows.map((plan) => (
                      <div key={plan.storeId} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <div className="font-medium text-slate-900">{getStoreDisplayName(stores, plan.storeId)}</div>
                        <div className="mt-1 flex items-center justify-between text-slate-600">
                          <span>{plan.lineCount} lines</span>
                          <span>{plan.quantityInIssueUnit} {plan.unit}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Value {formatCurrencyPKR(plan.acceptedValue)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Receipt className="size-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Bill Impact</h3>
                </div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Open Vendor Bills</span>
                    <span className="font-medium text-slate-900">{vendorOpenBills.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Current Outstanding</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrencyPKR(vendor?.currentBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bill This GRN</span>
                    <span className="font-medium text-slate-900">
                      {createVendorBill ? formatCurrencyPKR(totalValue) : 'Off'}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span>Bill Date</span>
                      <span className="font-medium text-slate-900">{formatDatePK(billPreview.billDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Due Date</span>
                      <span className="font-medium text-slate-900">{formatDatePK(billPreview.dueDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Projected Outstanding</span>
                      <span className="font-medium text-slate-900">
                        {createVendorBill
                          ? formatCurrencyPKR((vendor?.currentBalance || 0) + totalValue)
                          : formatCurrencyPKR(vendor?.currentBalance || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="text-sm text-slate-600">
            Stock will be posted store-by-store based on the line allocations above.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={items.length === 0}
              className="rounded border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create GRN & Update Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
