import api from './api';
import { PaymentScheduleEntry } from '../types';

export const paymentService = {
  async getPaymentsDueThisWeek(): Promise<PaymentScheduleEntry[]> {
    const { data } = await api.get('/admin/payments/due-this-week');
    return data;
  },

  async getOverduePayments(): Promise<PaymentScheduleEntry[]> {
    const { data } = await api.get('/admin/payments/overdue');
    return data;
  },

  async getPaymentHistory(dateRange?: { from?: string; to?: string }): Promise<PaymentScheduleEntry[]> {
    const { data } = await api.get('/admin/payments/history', { params: dateRange });
    return data;
  },

  async confirmPayment(scheduleId: string): Promise<void> {
    await api.post(`/admin/payments/${scheduleId}/confirm`);
  },

  async retryPayment(scheduleId: string): Promise<void> {
    await api.post(`/admin/payments/${scheduleId}/retry`);
  },

  // Member-facing
  async getMemberPayments(): Promise<{ history: PaymentScheduleEntry[]; next_payment: PaymentScheduleEntry | null }> {
    const { data } = await api.get('/members/payments');
    return data;
  },
};
