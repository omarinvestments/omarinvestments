'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChargeType, ChargeStatus, PaymentStatus } from '@shared/types';

interface TenantCharge {
  id: string;
  llcId: string;
  leaseId: string;
  propertyAddress: string;
  unitNumber: string;
  period: string;
  type: ChargeType;
  description?: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
  dueDate: string;
  createdAt: string;
}

interface TenantPayment {
  id: string;
  llcId: string;
  leaseId: string;
  propertyAddress: string;
  unitNumber: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
    checkNumber?: string;
  };
  appliedTo: { chargeId: string; amount: number }[];
  createdAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

type TabType = 'charges' | 'payments';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getChargeStatusBadge(status: ChargeStatus) {
  const styles: Record<ChargeStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    void: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getPaymentStatusBadge(status: PaymentStatus) {
  const styles: Record<PaymentStatus, string> = {
    requires_payment_method: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    requires_confirmation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    canceled: 'bg-muted text-muted-foreground',
    refunded: 'bg-muted text-muted-foreground',
  };
  const labels: Record<PaymentStatus, string> = {
    requires_payment_method: 'Pending',
    requires_confirmation: 'Confirming',
    processing: 'Processing',
    succeeded: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
    refunded: 'Refunded',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function getChargeTypeLabel(type: ChargeType): string {
  const labels: Record<ChargeType, string> = {
    rent: 'Rent',
    late_fee: 'Late Fee',
    utility: 'Utility',
    deposit: 'Deposit',
    pet_deposit: 'Pet Deposit',
    pet_rent: 'Pet Rent',
    parking: 'Parking',
    damage: 'Damage',
    other: 'Other',
  };
  return labels[type] || type;
}

function getPaymentMethodLabel(method: TenantPayment['paymentMethod']): string {
  if (method.type === 'card' && method.brand) {
    return `${method.brand} ****${method.last4}`;
  }
  if (method.type === 'check' && method.checkNumber) {
    return `Check #${method.checkNumber}`;
  }
  if (method.type === 'ach') {
    return method.last4 ? `ACH ****${method.last4}` : 'ACH Transfer';
  }
  return method.type.charAt(0).toUpperCase() + method.type.slice(1);
}

interface BillingTableProps {
  initialTab?: TabType;
  leaseId?: string;
}

export function BillingTable({ initialTab = 'charges', leaseId }: BillingTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [charges, setCharges] = useState<PaginatedResponse<TenantCharge> | null>(null);
  const [payments, setPayments] = useState<PaginatedResponse<TenantPayment> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  const fetchData = useCallback(async (tab: TabType, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (leaseId) {
        params.set('leaseId', leaseId);
      }

      const endpoint = tab === 'charges'
        ? `/api/portal/billing/charges?${params}`
        : `/api/portal/billing/payments?${params}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.ok) {
        if (tab === 'charges') {
          setCharges(data.data);
        } else {
          setPayments(data.data);
        }
      } else {
        setError(data.error || `Failed to load ${tab}`);
      }
    } catch (err) {
      setError(`Failed to load ${tab}`);
    } finally {
      setLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchData(activeTab, currentPage);
  }, [activeTab, currentPage, fetchData]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const currentData = activeTab === 'charges' ? charges : payments;

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => handleTabChange('charges')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'charges'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Charges
        </button>
        <button
          onClick={() => handleTabChange('payments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Payments
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 border rounded-lg border-destructive/50 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>
      ) : currentData && currentData.items.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border rounded-lg">
          No {activeTab} found.
        </div>
      ) : activeTab === 'charges' && charges ? (
        <div className="space-y-2">
          {charges.items.map((charge) => (
            <Link
              key={charge.id}
              href={`/portal/billing/charges/${charge.id}?llcId=${charge.llcId}`}
              className="block p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{getChargeTypeLabel(charge.type)}</span>
                    {getChargeStatusBadge(charge.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {charge.propertyAddress} - Unit {charge.unitNumber}
                  </p>
                  {charge.description && (
                    <p className="text-sm text-muted-foreground">{charge.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Period: {charge.period} • Due: {formatDate(charge.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(charge.amount)}</p>
                  {charge.balance > 0 && charge.balance !== charge.amount && (
                    <p className="text-sm text-muted-foreground">
                      Remaining: {formatCurrency(charge.balance)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : activeTab === 'payments' && payments ? (
        <div className="space-y-2">
          {payments.items.map((payment) => (
            <Link
              key={payment.id}
              href={`/portal/billing/payments/${payment.id}?llcId=${payment.llcId}`}
              className="block p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Payment</span>
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {payment.propertyAddress} - Unit {payment.unitNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getPaymentMethodLabel(payment.paymentMethod)} • {formatDateTime(payment.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {currentData && currentData.total > limit && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, currentData.total)} of {currentData.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!currentData.hasMore}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
