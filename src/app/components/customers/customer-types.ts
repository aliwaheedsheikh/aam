// Customer Database Types for VenueOps ERP

export type CustomerType = 'individual' | 'corporate' | 'government' | 'ngo';
export type CustomerSegment = 'vip' | 'premium' | 'regular' | 'new';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface Customer {
  id: string;
  
  // Basic Information
  customerCode: string; // Auto-generated: CUST-0001
  customerName: string;
  customerType: CustomerType;
  segment: CustomerSegment;
  status: CustomerStatus;
  
  // Contact Information
  primaryContact: string; // Phone number
  secondaryContact?: string;
  email?: string;
  whatsapp?: string;
  
  // Address
  address?: string;
  city: string;
  area?: string;
  
  // Corporate Details (if applicable)
  companyName?: string;
  designation?: string;
  gstNumber?: string;
  ntnNumber?: string;
  
  // Customer Preferences
  preferredVenues?: string[];
  preferredMenuType?: string;
  dietaryRestrictions?: string;
  specialRequirements?: string;
  
  // Financial Summary
  totalBookings: number;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  lifetimeValue: number;
  
  // Booking Statistics
  completedEvents: number;
  cancelledEvents: number;
  upcomingEvents: number;
  lastBookingDate?: Date;
  
  // Credit & Payment
  creditLimit?: number;
  paymentTerms?: string; // '100% Advance', '50-50', 'Credit 30 days'
  defaultDiscount?: number; // Percentage
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  notes?: string;
  tags?: string[]; // ['Wedding Specialist', 'Corporate Client', 'Referral']
  
  // Rating & Reviews
  customerRating?: number; // 1-5 stars (reliability, payment, behavior)
  internalNotes?: string; // Private notes for staff only
}

export interface CustomerBooking {
  bookingId: string;
  bookingDate: Date;
  eventDate: Date;
  serviceType: string;
  venueName?: string;
  guestCount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'tentative' | 'confirmed' | 'completed' | 'cancelled';
}

export interface CustomerPayment {
  id: string;
  paymentDate: Date;
  bookingId: string;
  bookingRef: string;
  amount: number;
  paymentMethod: string;
  receiptNumber: string;
  notes?: string;
}

export interface CustomerInteraction {
  id: string;
  date: Date;
  type: 'call' | 'email' | 'meeting' | 'visit' | 'whatsapp';
  subject: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  staffMember: string;
}

// Sample data for development
export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: '1',
    customerCode: 'CUST-0001',
    customerName: 'Ahmed Hassan',
    customerType: 'individual',
    segment: 'vip',
    status: 'active',
    primaryContact: '0300-1234567',
    secondaryContact: '0321-7654321',
    email: 'ahmed.hassan@example.com',
    whatsapp: '0300-1234567',
    address: 'House 123, Street 5, DHA Phase 6',
    city: 'Lahore',
    area: 'DHA',
    preferredMenuType: 'Continental',
    totalBookings: 12,
    totalRevenue: 3500000,
    totalPaid: 3500000,
    totalOutstanding: 0,
    lifetimeValue: 3500000,
    completedEvents: 10,
    cancelledEvents: 1,
    upcomingEvents: 1,
    lastBookingDate: new Date('2024-02-15'),
    paymentTerms: '100% Advance',
    defaultDiscount: 5,
    createdAt: new Date('2023-01-15'),
    createdBy: 'Admin',
    notes: 'Excellent customer, always books premium packages',
    tags: ['VIP', 'Wedding Specialist', 'Referral Source'],
    customerRating: 5,
  },
  {
    id: '2',
    customerCode: 'CUST-0002',
    customerName: 'Fatima Malik',
    customerType: 'individual',
    segment: 'premium',
    status: 'active',
    primaryContact: '0321-9876543',
    email: 'fatima.malik@example.com',
    address: 'Apartment 45, Gulberg III',
    city: 'Lahore',
    area: 'Gulberg',
    totalBookings: 5,
    totalRevenue: 1200000,
    totalPaid: 1200000,
    totalOutstanding: 0,
    lifetimeValue: 1200000,
    completedEvents: 4,
    cancelledEvents: 0,
    upcomingEvents: 1,
    lastBookingDate: new Date('2024-01-20'),
    createdAt: new Date('2023-06-10'),
    createdBy: 'Admin',
    tags: ['Corporate Events'],
    customerRating: 4,
  },
  {
    id: '3',
    customerCode: 'CUST-0003',
    customerName: 'TechCorp Solutions',
    customerType: 'corporate',
    segment: 'premium',
    status: 'active',
    primaryContact: '0300-5551234',
    email: 'events@techcorp.com',
    address: 'Office Tower, MM Alam Road',
    city: 'Lahore',
    area: 'Gulberg',
    companyName: 'TechCorp Solutions Pvt Ltd',
    designation: 'HR Manager',
    gstNumber: 'GST-12345678',
    ntnNumber: 'NTN-87654321',
    totalBookings: 8,
    totalRevenue: 2100000,
    totalPaid: 1900000,
    totalOutstanding: 200000,
    lifetimeValue: 2100000,
    completedEvents: 7,
    cancelledEvents: 0,
    upcomingEvents: 1,
    lastBookingDate: new Date('2024-03-01'),
    creditLimit: 500000,
    paymentTerms: 'Credit 30 days',
    createdAt: new Date('2023-03-20'),
    createdBy: 'Admin',
    notes: 'Monthly corporate events, reliable payment',
    tags: ['Corporate', 'Monthly Client'],
    customerRating: 5,
  },
  {
    id: '4',
    customerCode: 'CUST-0004',
    customerName: 'Ali Raza',
    customerType: 'individual',
    segment: 'regular',
    status: 'active',
    primaryContact: '0333-1112233',
    email: 'ali.raza@example.com',
    city: 'Lahore',
    area: 'Johar Town',
    totalBookings: 2,
    totalRevenue: 450000,
    totalPaid: 450000,
    totalOutstanding: 0,
    lifetimeValue: 450000,
    completedEvents: 2,
    cancelledEvents: 0,
    upcomingEvents: 0,
    lastBookingDate: new Date('2023-12-10'),
    createdAt: new Date('2023-11-05'),
    createdBy: 'Sales Team',
    customerRating: 4,
  },
  {
    id: '5',
    customerCode: 'CUST-0005',
    customerName: 'Sarah Ahmed',
    customerType: 'individual',
    segment: 'new',
    status: 'active',
    primaryContact: '0345-6667788',
    email: 'sarah.ahmed@example.com',
    city: 'Lahore',
    totalBookings: 1,
    totalRevenue: 150000,
    totalPaid: 75000,
    totalOutstanding: 75000,
    lifetimeValue: 150000,
    completedEvents: 0,
    cancelledEvents: 0,
    upcomingEvents: 1,
    createdAt: new Date('2024-03-10'),
    createdBy: 'Sales Team',
    customerRating: 3,
  },
];
