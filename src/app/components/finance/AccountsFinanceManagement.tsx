import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  Calendar,
  PieChart,
  Activity,
  Banknote,
  BarChart3,
  Building2,
  Landmark,
  ListTree,
  Settings,
} from 'lucide-react';
import { Amount } from '../design-system';
import { toast } from 'sonner';
import {
  CustomerInvoice,
  VendorBill,
  PaymentReceipt,
  PaymentVoucher,
  GeneralExpense,
  CreditDebitNote,
  Booking,
  KitchenIssueSheet,
  PurchaseItem,
  PurchaseOrder,
  Vendor,
} from '../kitchen/types';
import { usePersistedWorkflowState, WORKFLOW_STATE_KEYS } from '@/app/lib/workflowState';
import {
  buildProfitLossReport,
  DEFAULT_CHART_OF_ACCOUNTS,
  DEFAULT_POSTING_RULES,
  ChartAccount,
  PostingRule,
  ProfitLossGroupBy,
} from '@/app/lib/accounting';

interface AccountsFinanceManagementProps {
  userName: string;
  bookings: Booking[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  vendorBills?: VendorBill[];
  kitchenIssueSheets?: KitchenIssueSheet[];
  purchaseItems?: PurchaseItem[];
  onVendorBillsChange?: (bills: VendorBill[]) => void;
  onBack: () => void;
}

type FinanceTab =
  | 'dashboard'
  | 'profit-loss'
  | 'accounts-receivable'
  | 'accounts-payable'
  | 'invoicing'
  | 'payments'
  | 'expenses'
  | 'accounting-setup';

export function AccountsFinanceManagement({
  userName,
  bookings,
  purchaseOrders,
  vendors,
  vendorBills: controlledVendorBills,
  kitchenIssueSheets = [],
  purchaseItems = [],
  onVendorBillsChange,
  onBack,
}: AccountsFinanceManagementProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [pnlGroupBy, setPnlGroupBy] = useState<ProfitLossGroupBy>('venue');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVendorBill, setSelectedVendorBill] = useState<VendorBill | null>(null);
  const [payVendorBillOpen, setPayVendorBillOpen] = useState(false);
  const [vendorPaymentAmount, setVendorPaymentAmount] = useState(0);
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<PaymentVoucher['paymentMethod']>('bank-transfer');
  const [vendorPaymentReference, setVendorPaymentReference] = useState('');
  const [vendorPaymentBankName, setVendorPaymentBankName] = useState('');

  // Sample data - In production, this would come from props
  const [customerInvoices, setCustomerInvoices] = usePersistedWorkflowState<CustomerInvoice[]>(
    WORKFLOW_STATE_KEYS.customerInvoices,
    [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-20240106-001',
      invoiceDate: new Date('2024-01-06'),
      dueDate: new Date('2024-01-13'),
      bookingId: 'booking-1',
      customerName: 'Ahmed Khan',
      customerPhone: '0300-1234567',
      customerEmail: 'ahmed@example.com',
      eventDate: new Date('2024-01-15'),
      venueName: 'Aiwan-e-Akbari',
      items: [
        {
          id: 'item-1',
          description: 'Venue Booking - Aiwan-e-Akbari',
          itemType: 'venue-charges',
          quantity: 1,
          unit: 'event',
          ratePerUnit: 250000,
          amount: 250000,
          taxable: true,
        },
        {
          id: 'item-2',
          description: 'Wedding Menu Package (500 guests)',
          itemType: 'menu-package',
          quantity: 500,
          unit: 'per-head',
          ratePerUnit: 1500,
          amount: 750000,
          taxable: true,
        },
        {
          id: 'item-3',
          description: 'Service Charges',
          itemType: 'service-charges',
          quantity: 1,
          unit: 'event',
          ratePerUnit: 100000,
          amount: 100000,
          taxable: false,
        },
      ],
      subtotal: 1100000,
      taxRate: 5,
      taxAmount: 50000,
      discount: 50000,
      discountReason: 'Early bird discount',
      totalAmount: 1100000,
      amountPaid: 400000,
      amountPending: 700000,
      status: 'partially-paid',
      paymentHistory: [
        {
          id: 'rcp-1',
          receiptNumber: 'RCP-20240106-001',
          receiptDate: new Date('2024-01-06'),
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-20240106-001',
          customerName: 'Ahmed Khan',
          amount: 400000,
          paymentMethod: 'bank-transfer',
          paymentReference: 'TXN123456789',
          bankName: 'HBL',
          reconciled: true,
          reconciledDate: new Date('2024-01-06'),
          receivedBy: userName,
          createdAt: new Date('2024-01-06'),
        },
      ],
      createdBy: userName,
      createdAt: new Date('2024-01-06'),
      sentAt: new Date('2024-01-06'),
      updatedAt: new Date('2024-01-06'),
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-20240105-002',
      invoiceDate: new Date('2024-01-05'),
      dueDate: new Date('2024-01-12'),
      bookingId: 'booking-2',
      customerName: 'Fatima Siddiqui',
      customerPhone: '0321-9876543',
      eventDate: new Date('2024-01-20'),
      venueName: 'Sheesh Mahal',
      items: [
        {
          id: 'item-1',
          description: 'Venue Booking - Sheesh Mahal',
          itemType: 'venue-charges',
          quantity: 1,
          unit: 'event',
          ratePerUnit: 300000,
          amount: 300000,
          taxable: true,
        },
        {
          id: 'item-2',
          description: 'Corporate Menu Package (200 guests)',
          itemType: 'menu-package',
          quantity: 200,
          unit: 'per-head',
          ratePerUnit: 1200,
          amount: 240000,
          taxable: true,
        },
      ],
      subtotal: 540000,
      taxRate: 5,
      taxAmount: 27000,
      discount: 0,
      totalAmount: 567000,
      amountPaid: 567000,
      amountPending: 0,
      status: 'paid',
      paymentHistory: [
        {
          id: 'rcp-2',
          receiptNumber: 'RCP-20240105-001',
          receiptDate: new Date('2024-01-05'),
          invoiceId: 'inv-2',
          invoiceNumber: 'INV-20240105-002',
          customerName: 'Fatima Siddiqui',
          amount: 567000,
          paymentMethod: 'cash',
          reconciled: true,
          receivedBy: userName,
          createdAt: new Date('2024-01-05'),
        },
      ],
      createdBy: userName,
      createdAt: new Date('2024-01-05'),
      sentAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    },
    {
      id: 'inv-3',
      invoiceNumber: 'INV-20240103-003',
      invoiceDate: new Date('2024-01-03'),
      dueDate: new Date('2024-01-05'),
      bookingId: 'booking-3',
      customerName: 'Hassan Ali',
      customerPhone: '0333-5555555',
      eventDate: new Date('2024-01-25'),
      venueName: 'Diwan-e-Khas',
      items: [
        {
          id: 'item-1',
          description: 'Venue Booking',
          itemType: 'venue-charges',
          quantity: 1,
          unit: 'event',
          ratePerUnit: 200000,
          amount: 200000,
          taxable: true,
        },
      ],
      subtotal: 200000,
      taxRate: 5,
      taxAmount: 10000,
      discount: 0,
      totalAmount: 210000,
      amountPaid: 0,
      amountPending: 210000,
      status: 'overdue',
      paymentHistory: [],
      createdBy: userName,
      createdAt: new Date('2024-01-03'),
      sentAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
  ]);

  const [persistedVendorBills, setPersistedVendorBills] = usePersistedWorkflowState<VendorBill[]>(
    WORKFLOW_STATE_KEYS.vendorBills,
    [
    {
      id: 'bill-1',
      billNumber: 'BILL-20240106-001',
      vendorBillNumber: 'VB-2024-456',
      billDate: new Date('2024-01-06'),
      dueDate: new Date('2024-01-13'),
      vendorId: 'vendor-1',
      vendorName: 'Al-Rehman Poultry Farm',
      purchaseOrderId: 'po-1',
      poNumber: 'PO-20240105-001',
      items: [
        {
          id: 'item-1',
          purchaseItemId: 'purchase-1',
          itemName: 'Chicken With Bone',
          quantity: 500,
          unit: 'kg',
          ratePerUnit: 280,
          amount: 140000,
        },
      ],
      subtotal: 140000,
      taxRate: 5,
      taxAmount: 7000,
      totalAmount: 147000,
      amountPaid: 100000,
      amountPending: 47000,
      status: 'partially-paid',
      paymentHistory: [
        {
          id: 'pv-1',
          voucherNumber: 'PV-20240106-001',
          paymentDate: new Date('2024-01-06'),
          vendorId: 'vendor-1',
          vendorName: 'Al-Rehman Poultry Farm',
          billId: 'bill-1',
          billNumber: 'BILL-20240106-001',
          amount: 100000,
          paymentMethod: 'bank-transfer',
          paymentReference: 'TXN987654321',
          bankName: 'MCB',
          approvedBy: 'General Manager',
          approvedAt: new Date('2024-01-06'),
          paidBy: userName,
          createdAt: new Date('2024-01-06'),
        },
      ],
      createdBy: userName,
      createdAt: new Date('2024-01-06'),
      updatedAt: new Date('2024-01-06'),
    },
    {
      id: 'bill-2',
      billNumber: 'BILL-20240105-002',
      billDate: new Date('2024-01-05'),
      dueDate: new Date('2024-02-04'),
      vendorId: 'vendor-2',
      vendorName: 'Fresh Vegetables Suppliers',
      items: [
        {
          id: 'item-1',
          purchaseItemId: 'purchase-3',
          itemName: 'Tomatoes',
          quantity: 200,
          unit: 'kg',
          ratePerUnit: 60,
          amount: 12000,
        },
        {
          id: 'item-2',
          purchaseItemId: 'purchase-4',
          itemName: 'Onions',
          quantity: 300,
          unit: 'kg',
          ratePerUnit: 40,
          amount: 12000,
        },
      ],
      subtotal: 24000,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 24000,
      amountPaid: 0,
      amountPending: 24000,
      status: 'pending',
      paymentHistory: [],
      createdBy: userName,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    },
  ]);
  const vendorBills = controlledVendorBills ?? persistedVendorBills;
  const setVendorBills = onVendorBillsChange ?? setPersistedVendorBills;

  const [generalExpenses, setGeneralExpenses] = usePersistedWorkflowState<GeneralExpense[]>(
    WORKFLOW_STATE_KEYS.generalExpenses,
    [
    {
      id: 'exp-1',
      expenseNumber: 'EXP-20240106-001',
      expenseDate: new Date('2024-01-06'),
      category: 'utilities',
      description: 'Electricity Bill - December 2023',
      amount: 45000,
      paymentMethod: 'bank-transfer',
      paymentReference: 'UTIL-2024-001',
      approvedBy: 'General Manager',
      approvedAt: new Date('2024-01-06'),
      createdBy: userName,
      createdAt: new Date('2024-01-06'),
    },
    {
      id: 'exp-2',
      expenseNumber: 'EXP-20240105-002',
      expenseDate: new Date('2024-01-05'),
      category: 'maintenance',
      description: 'AC Repair - Aiwan-e-Akbari',
      amount: 25000,
      paymentMethod: 'cash',
      createdBy: userName,
      createdAt: new Date('2024-01-05'),
    },
  ]);

  const [chartOfAccounts, setChartOfAccounts] = usePersistedWorkflowState<ChartAccount[]>(
    WORKFLOW_STATE_KEYS.chartOfAccounts,
    DEFAULT_CHART_OF_ACCOUNTS,
  );
  const [postingRules, setPostingRules] = usePersistedWorkflowState<PostingRule[]>(
    WORKFLOW_STATE_KEYS.accountingPostingRules,
    DEFAULT_POSTING_RULES,
  );

  const openVendorBillPayment = (bill: VendorBill) => {
    setSelectedVendorBill(bill);
    setVendorPaymentAmount(bill.amountPending);
    setVendorPaymentMethod('bank-transfer');
    setVendorPaymentReference('');
    setVendorPaymentBankName('');
    setPayVendorBillOpen(true);
  };

  const closeVendorBillPayment = () => {
    setSelectedVendorBill(null);
    setPayVendorBillOpen(false);
    setVendorPaymentAmount(0);
    setVendorPaymentMethod('bank-transfer');
    setVendorPaymentReference('');
    setVendorPaymentBankName('');
  };

  const handleVendorBillPayment = () => {
    if (!selectedVendorBill) {
      return;
    }

    if (vendorPaymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (vendorPaymentAmount > selectedVendorBill.amountPending) {
      toast.error('Payment amount cannot exceed pending bill balance');
      return;
    }

    const voucherNumber = `PV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const paymentVoucher: PaymentVoucher = {
      id: `pv-${Date.now()}`,
      voucherNumber,
      paymentDate: new Date(),
      vendorId: selectedVendorBill.vendorId,
      vendorName: selectedVendorBill.vendorName,
      billId: selectedVendorBill.id,
      billNumber: selectedVendorBill.billNumber,
      amount: vendorPaymentAmount,
      paymentMethod: vendorPaymentMethod,
      paymentReference: vendorPaymentReference || undefined,
      bankName: vendorPaymentBankName || undefined,
      paidBy: userName,
      createdAt: new Date(),
    };

    setVendorBills((currentBills) =>
      currentBills.map((bill) => {
        if (bill.id !== selectedVendorBill.id) {
          return bill;
        }

        const amountPaid = bill.amountPaid + vendorPaymentAmount;
        const amountPending = Math.max(0, bill.totalAmount - amountPaid);
        const nextStatus: VendorBill['status'] =
          amountPending === 0 ? 'paid' : amountPaid > 0 ? 'partially-paid' : 'pending';

        return {
          ...bill,
          amountPaid,
          amountPending,
          status: nextStatus,
          paymentHistory: [...bill.paymentHistory, paymentVoucher],
          updatedAt: new Date(),
        };
      }),
    );

    toast.success('Vendor payment recorded', {
      description: `${voucherNumber} posted for ${selectedVendorBill.vendorName}`,
    });

    closeVendorBillPayment();
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    // AR Metrics
    const totalReceivables = customerInvoices.reduce((sum, inv) => sum + inv.amountPending, 0);
    const overdueReceivables = customerInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amountPending, 0);
    const receivedThisMonth = customerInvoices
      .filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        const now = new Date();
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.amountPaid, 0);

    // AP Metrics
    const totalPayables = vendorBills.reduce((sum, bill) => sum + bill.amountPending, 0);
    const overduePayables = vendorBills
      .filter(bill => bill.status === 'overdue')
      .reduce((sum, bill) => sum + bill.amountPending, 0);
    const paidThisMonth = vendorBills
      .filter(bill => {
        const billDate = new Date(bill.billDate);
        const now = new Date();
        return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, bill) => sum + bill.amountPaid, 0);

    // Revenue
    const totalRevenue = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const thisMonthRevenue = customerInvoices
      .filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        const now = new Date();
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Expenses
    const totalExpenses = generalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const thisMonthExpenses = generalExpenses
      .filter(exp => {
        const expDate = new Date(exp.expenseDate);
        const now = new Date();
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Aging Analysis
    const today = new Date();
    const aging = {
      ar: {
        current: 0, // 0-30 days
        days30: 0,  // 31-60 days
        days60: 0,  // 61-90 days
        days90: 0,  // 90+ days
      },
      ap: {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
      },
    };

    customerInvoices.forEach(inv => {
      if (inv.amountPending > 0) {
        const daysDiff = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) aging.ar.current += inv.amountPending;
        else if (daysDiff <= 60) aging.ar.days30 += inv.amountPending;
        else if (daysDiff <= 90) aging.ar.days60 += inv.amountPending;
        else aging.ar.days90 += inv.amountPending;
      }
    });

    vendorBills.forEach(bill => {
      if (bill.amountPending > 0) {
        const daysDiff = Math.floor((today.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) aging.ap.current += bill.amountPending;
        else if (daysDiff <= 60) aging.ap.days30 += bill.amountPending;
        else if (daysDiff <= 90) aging.ap.days60 += bill.amountPending;
        else aging.ap.days90 += bill.amountPending;
      }
    });

    return {
      totalReceivables,
      overdueReceivables,
      receivedThisMonth,
      totalPayables,
      overduePayables,
      paidThisMonth,
      totalRevenue,
      thisMonthRevenue,
      totalExpenses,
      thisMonthExpenses,
      aging,
      cashFlow: receivedThisMonth - paidThisMonth - thisMonthExpenses,
    };
  }, [customerInvoices, vendorBills, generalExpenses]);

  const profitLossReport = useMemo(
    () =>
      buildProfitLossReport({
        bookings,
        kitchenIssueSheets,
        purchaseItems,
        vendorBills,
        groupBy: pnlGroupBy,
      }),
    [bookings, kitchenIssueSheets, purchaseItems, pnlGroupBy, vendorBills],
  );

  const accountSummary = useMemo(() => {
    const activeAccounts = chartOfAccounts.filter((account) => account.isActive);
    return {
      activeAccounts: activeAccounts.length,
      balanceSheetAccounts: activeAccounts.filter((account) => account.statement === 'Balance Sheet').length,
      profitLossAccounts: activeAccounts.filter((account) => account.statement === 'Profit & Loss').length,
      revenueAccounts: activeAccounts.filter((account) => account.type === 'Revenue').length,
      expenseAccounts: activeAccounts.filter((account) => account.type === 'Expense').length,
    };
  }, [chartOfAccounts]);

  const filteredChartOfAccounts = useMemo(() => {
    const normalizedSearch = accountSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return chartOfAccounts;
    }

    return chartOfAccounts.filter((account) =>
      [account.code, account.name, account.type, account.category, account.statement]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [accountSearchTerm, chartOfAccounts]);

  const toggleAccountActive = (accountId: string) => {
    setChartOfAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === accountId ? { ...account, isActive: !account.isActive } : account,
      ),
    );
  };

  const togglePostingRuleActive = (ruleId: string) => {
    setPostingRules((currentRules) =>
      currentRules.map((rule) => (rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule)),
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'draft': <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Draft</span>,
      'sent': <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Sent</span>,
      'partially-paid': <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">Partial</span>,
      'paid': <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Paid</span>,
      'overdue': <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Overdue</span>,
      'pending': <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Pending</span>,
      'cancelled': <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Cancelled</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'profit-loss', label: 'Profit & Loss', icon: BarChart3 },
    { id: 'accounts-receivable', label: 'Accounts Receivable', icon: TrendingUp },
    { id: 'accounts-payable', label: 'Accounts Payable', icon: TrendingDown },
    { id: 'invoicing', label: 'Invoicing', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'accounting-setup', label: 'Accounting Setup', icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Accounts & Finance</h1>
            <p className="text-sm text-gray-600 mt-1">
              Complete financial management, invoicing, and accounting
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="size-4" />
            New Invoice
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="size-4" />
            Export
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FinanceTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Accounts Receivable */}
              <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="size-6 text-green-600" />
                  </div>
                  {metrics.overdueReceivables > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">Accounts Receivable</p>
                <Amount value={metrics.totalReceivables} variant="neutral" size="2xl" bold compact />
                <p className="text-sm text-red-600 mt-1">
                  <Amount value={metrics.overdueReceivables} variant="negative" size="sm" compact /> overdue
                </p>
              </div>

              {/* Accounts Payable */}
              <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <TrendingDown className="size-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Accounts Payable</p>
                <Amount value={metrics.totalPayables} variant="neutral" size="2xl" bold compact />
                <p className="text-sm text-gray-500 mt-1">To {vendorBills.filter(b => b.amountPending > 0).length} vendors</p>
              </div>

              {/* Revenue This Month */}
              <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Banknote className="size-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Revenue This Month</p>
                <Amount value={metrics.thisMonthRevenue} variant="neutral" size="2xl" bold compact />
                <p className="text-sm text-green-600 mt-1">
                  <Amount value={metrics.receivedThisMonth} variant="positive" size="sm" compact /> collected
                </p>
              </div>

              {/* Cash Flow */}
              <div className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Activity className="size-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Cash Flow (This Month)</p>
                <Amount 
                  value={Math.abs(metrics.cashFlow)} 
                  variant={metrics.cashFlow >= 0 ? "positive" : "negative"} 
                  size="2xl" 
                  bold 
                  compact 
                />
                <p className="text-sm text-gray-500 mt-1">
                  {metrics.cashFlow >= 0 ? 'Positive' : 'Negative'} flow
                </p>
              </div>
            </div>

            {/* Aging Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AR Aging */}
              <div className="bg-white rounded-lg border p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="size-5 text-green-600" />
                  Receivables Aging Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Current (0-30 days)</p>
                      <p className="text-xs text-gray-500">Within due date</p>
                    </div>
                    <Amount value={metrics.aging.ar.current} variant="positive" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">31-60 days</p>
                      <p className="text-xs text-gray-500">Slightly overdue</p>
                    </div>
                    <Amount value={metrics.aging.ar.days30} variant="highlight" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">61-90 days</p>
                      <p className="text-xs text-gray-500">Significantly overdue</p>
                    </div>
                    <Amount value={metrics.aging.ar.days60} variant="warning" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">90+ days</p>
                      <p className="text-xs text-gray-500">Critical collection</p>
                    </div>
                    <Amount value={metrics.aging.ar.days90} variant="negative" size="lg" bold compact />
                  </div>
                </div>
              </div>

              {/* AP Aging */}
              <div className="bg-white rounded-lg border p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="size-5 text-red-600" />
                  Payables Aging Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Current (0-30 days)</p>
                      <p className="text-xs text-gray-500">Within due date</p>
                    </div>
                    <Amount value={metrics.aging.ap.current} variant="positive" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">31-60 days</p>
                      <p className="text-xs text-gray-500">Payment due soon</p>
                    </div>
                    <Amount value={metrics.aging.ap.days30} variant="highlight" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">61-90 days</p>
                      <p className="text-xs text-gray-500">Urgent payment needed</p>
                    </div>
                    <Amount value={metrics.aging.ap.days60} variant="warning" size="lg" bold compact />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">90+ days</p>
                      <p className="text-xs text-gray-500">Critical payment</p>
                    </div>
                    <Amount value={metrics.aging.ap.days90} variant="negative" size="lg" bold compact />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Invoices */}
              <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="size-5 text-blue-600" />
                    Recent Invoices
                  </h3>
                  <button
                    onClick={() => setActiveTab('accounts-receivable')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {customerInvoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{inv.invoiceNumber}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{inv.customerName}</p>
                        </div>
                        {getStatusBadge(inv.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Amount: <Amount value={inv.totalAmount} size="sm" showCode={false} /></span>
                        <span>Pending: <Amount value={inv.amountPending} variant="negative" size="sm" showCode={false} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Bills */}
              <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="size-5 text-orange-600" />
                    Recent Vendor Bills
                  </h3>
                  <button
                    onClick={() => setActiveTab('accounts-payable')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {vendorBills.slice(0, 5).map(bill => (
                    <div key={bill.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{bill.billNumber}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{bill.vendorName}</p>
                        </div>
                        {getStatusBadge(bill.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Amount: <Amount value={bill.totalAmount} size="sm" showCode={false} /></span>
                        <span>Pending: <Amount value={bill.amountPending} variant="warning" size="sm" showCode={false} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFIT & LOSS TAB */}
        {activeTab === 'profit-loss' && (
          <div className="h-full overflow-y-auto bg-gray-50 p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profit & Loss</h2>
                <p className="text-sm text-gray-500">Revenue, direct event costs, and gross profit by operating dimension</p>
              </div>
              <div className="flex rounded-lg border bg-white p-1">
                <button
                  onClick={() => setPnlGroupBy('venue')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    pnlGroupBy === 'venue' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Building2 className="size-4" />
                  Venue
                </button>
                <button
                  onClick={() => setPnlGroupBy('prime-space')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    pnlGroupBy === 'prime-space' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ListTree className="size-4" />
                  Prime Space
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Recognized Revenue</p>
                <div className="mt-2">
                  <Amount value={profitLossReport.totals.revenue} size="2xl" bold compact />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Direct Costs</p>
                <div className="mt-2">
                  <Amount value={profitLossReport.totals.directCost} variant="negative" size="2xl" bold compact />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Gross Profit</p>
                <div className="mt-2">
                  <Amount
                    value={Math.abs(profitLossReport.totals.grossProfit)}
                    variant={profitLossReport.totals.grossProfit >= 0 ? 'positive' : 'negative'}
                    size="2xl"
                    bold
                    compact
                  />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Gross Margin</p>
                <p
                  className={`mt-2 text-2xl font-bold tabular-nums ${
                    profitLossReport.totals.grossMargin >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {profitLossReport.totals.grossMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">
                      {pnlGroupBy === 'venue' ? 'Venue' : 'Prime Space'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Food Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Outsource Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Direct Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Gross Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Margin</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-700">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {profitLossReport.rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={8}>
                        No confirmed or completed reservations are available for P&L reporting.
                      </td>
                    </tr>
                  ) : (
                    profitLossReport.rows.map((row) => (
                      <tr key={row.dimensionId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{row.dimensionName}</p>
                          <p className="text-xs text-gray-500">{row.dimensionId}</p>
                          {row.unvaluedIssueLines > 0 && (
                            <p className="mt-1 text-xs text-amber-700">
                              {Math.ceil(row.unvaluedIssueLines)} stock issue line(s) need item cost
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Amount value={row.revenue} bold compact />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Amount value={row.foodCost} variant="negative" compact />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Amount value={row.outsourcedCost} variant="negative" compact />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Amount value={row.directCost} variant="negative" bold compact />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Amount
                            value={Math.abs(row.grossProfit)}
                            variant={row.grossProfit >= 0 ? 'positive' : 'negative'}
                            bold
                            compact
                          />
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${
                            row.grossMargin >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {row.grossMargin.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">{row.eventCount.toFixed(1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Unallocated AP balance: <Amount value={profitLossReport.unallocatedPayables} size="sm" compact />. Vendor
              bills stay on AP/Inventory until a booking-linked kitchen issue posts event cost.
            </div>
          </div>
        )}

        {/* ACCOUNTING SETUP TAB */}
        {activeTab === 'accounting-setup' && (
          <div className="h-full overflow-y-auto bg-gray-50 p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Accounting Setup</h2>
                <p className="text-sm text-gray-500">Chart of accounts, posting rules, and reporting dimensions</p>
              </div>
              <button
                onClick={() => {
                  setChartOfAccounts(DEFAULT_CHART_OF_ACCOUNTS);
                  setPostingRules(DEFAULT_POSTING_RULES);
                  toast.success('Accounting setup restored to default controls');
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Restore Defaults
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Active Accounts</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{accountSummary.activeAccounts}</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Balance Sheet</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{accountSummary.balanceSheetAccounts}</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">P&L Accounts</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{accountSummary.profitLossAccounts}</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-gray-600">Active Posting Rules</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {postingRules.filter((rule) => rule.isActive).length}
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[
                { label: 'Booking Dimension', value: 'bookingId -> venueId -> primeSpaceId -> subSpaceId' },
                { label: 'Store Dimension', value: 'storeLocation -> inventory account' },
                { label: 'Vendor Dimension', value: 'vendorId -> AP control account' },
              ].map((dimension) => (
                <div key={dimension.label} className="rounded-lg border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Landmark className="size-4 text-blue-600" />
                    {dimension.label}
                  </div>
                  <p className="text-sm text-gray-600">{dimension.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-lg border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <h3 className="font-bold text-gray-900">Chart of Accounts</h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={accountSearchTerm}
                    onChange={(event) => setAccountSearchTerm(event.target.value)}
                    placeholder="Search accounts"
                    className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Statement</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChartOfAccounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{account.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-500">Normal: {account.normalBalance}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{account.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{account.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{account.statement}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAccountActive(account.id)}
                            disabled={account.systemControlled}
                            className={`rounded px-3 py-1 text-xs font-medium ${
                              account.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            } ${account.systemControlled ? 'cursor-not-allowed opacity-70' : 'hover:ring-2 hover:ring-blue-200'}`}
                          >
                            {account.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border bg-white">
              <div className="border-b p-4">
                <h3 className="font-bold text-gray-900">Posting Rules</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Event</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Debit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Credit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-700">Dimension</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postingRules.map((rule) => (
                      <tr key={rule.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.module}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{rule.label}</p>
                          <p className="text-xs text-gray-500">{rule.timing}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{rule.debitAccountCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{rule.creditAccountCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{rule.dimensionSource}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => togglePostingRuleActive(rule.id)}
                            className={`rounded px-3 py-1 text-xs font-medium ${
                              rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            } hover:ring-2 hover:ring-blue-200`}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNTS RECEIVABLE TAB */}
        {activeTab === 'accounts-receivable' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="bg-white border-b p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partially-paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Event Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Pending</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices
                      .filter(inv => statusFilter === 'all' || inv.status === statusFilter)
                      .map((inv, index) => (
                        <tr key={inv.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString()}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{inv.customerName}</p>
                            <p className="text-xs text-gray-500">{inv.customerPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(inv.eventDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700">{new Date(inv.dueDate).toLocaleDateString()}</p>
                            {inv.status === 'overdue' && (
                              <p className="text-xs text-red-600">Overdue</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={inv.totalAmount} bold />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={inv.amountPaid} variant="positive" bold />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={inv.amountPending} variant="negative" bold />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(inv.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Eye className="size-4 text-gray-600" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Download className="size-4 text-gray-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNTS PAYABLE TAB */}
        {activeTab === 'accounts-payable' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="bg-white border-b p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partially-paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Bills Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bill Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bill Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Pending</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorBills
                      .filter(bill => statusFilter === 'all' || bill.status === statusFilter)
                      .map((bill, index) => (
                        <tr key={bill.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{bill.billNumber}</p>
                            {bill.vendorBillNumber && (
                              <p className="text-xs text-gray-500">Ref: {bill.vendorBillNumber}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{bill.vendorName}</p>
                            {bill.poNumber && (
                              <p className="text-xs text-gray-500">PO: {bill.poNumber}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(bill.billDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(bill.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={bill.totalAmount} bold />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={bill.amountPaid} variant="positive" bold />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Amount value={bill.amountPending} variant="warning" bold />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(bill.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Eye className="size-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => openVendorBillPayment(bill)}
                                disabled={bill.amountPending <= 0}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                              >
                                Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INVOICING TAB */}
        {activeTab === 'invoicing' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Invoice Management</h3>
              <p className="text-gray-600 mb-4">
                Create and manage customer invoices from confirmed bookings
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
                  <Plus className="size-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Create Invoice</p>
                  <p className="text-sm text-gray-500">From booking</p>
                </div>
                <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
                  <FileText className="size-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Invoice Templates</p>
                  <p className="text-sm text-gray-500">Customize layouts</p>
                </div>
                <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
                  <Download className="size-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Bulk Export</p>
                  <p className="text-sm text-gray-500">Download PDFs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Receipts */}
              <div className="bg-white rounded-lg border p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Banknote className="size-5 text-green-600" />
                  Recent Payment Receipts (AR)
                </h3>
                <div className="space-y-3">
                  {customerInvoices
                    .flatMap(inv => inv.paymentHistory)
                    .sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime())
                    .slice(0, 10)
                    .map(receipt => (
                      <div key={receipt.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{receipt.receiptNumber}</p>
                            <p className="text-xs text-gray-600">{receipt.customerName}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            <Amount value={receipt.amount} size="xs" showCode={false} />
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{receipt.paymentMethod}</span>
                          <span>{new Date(receipt.receiptDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Payment Vouchers */}
              <div className="bg-white rounded-lg border p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Receipt className="size-5 text-orange-600" />
                  Recent Payment Vouchers (AP)
                </h3>
                <div className="space-y-3">
                  {vendorBills
                    .flatMap(bill => bill.paymentHistory)
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .slice(0, 10)
                    .map(voucher => (
                      <div key={voucher.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{voucher.voucherNumber}</p>
                            <p className="text-xs text-gray-600">{voucher.vendorName}</p>
                          </div>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            <Amount value={voucher.amount} size="xs" showCode={false} />
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{voucher.paymentMethod}</span>
                          <span>{new Date(voucher.paymentDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">General Expenses</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Plus className="size-4" />
                  Add Expense
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expense #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment Method</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generalExpenses.map((exp, index) => (
                      <tr key={exp.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{exp.expenseNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(exp.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {exp.category.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{exp.description}</td>
                        <td className="px-4 py-3 text-right">
                          <Amount value={exp.amount} bold />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{exp.paymentMethod}</td>
                        <td className="px-4 py-3 text-center">
                          {exp.approvedBy ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              <CheckCircle className="size-3 inline mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                              <Clock className="size-3 inline mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {payVendorBillOpen && selectedVendorBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Record Vendor Payment</h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedVendorBill.vendorName} • {selectedVendorBill.billNumber}
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-3 gap-4 rounded-lg border bg-gray-50 p-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Bill</p>
                  <p className="font-semibold text-gray-900">
                    <Amount value={selectedVendorBill.totalAmount} bold />
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Paid</p>
                  <p className="font-semibold text-green-700">
                    <Amount value={selectedVendorBill.amountPaid} variant="positive" bold />
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Pending</p>
                  <p className="font-semibold text-orange-700">
                    <Amount value={selectedVendorBill.amountPending} variant="warning" bold />
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Payment Amount</label>
                <input
                  type="number"
                  min="0"
                  max={selectedVendorBill.amountPending}
                  step="0.01"
                  value={vendorPaymentAmount}
                  onChange={(e) => setVendorPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={vendorPaymentMethod}
                    onChange={(e) => setVendorPaymentMethod(e.target.value as PaymentVoucher['paymentMethod'])}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Reference</label>
                  <input
                    type="text"
                    value={vendorPaymentReference}
                    onChange={(e) => setVendorPaymentReference(e.target.value)}
                    placeholder="Transaction / cheque reference"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={vendorPaymentBankName}
                  onChange={(e) => setVendorPaymentBankName(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button
                onClick={closeVendorBillPayment}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleVendorBillPayment}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
