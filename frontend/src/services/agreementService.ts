import api from './api';
import { RentalAgreement } from '../types';

export interface CreateAgreementPayload {
  vehicle_id: string;
  member_id: string;
  weekly_rental_amount?: number;
  deposit_amount?: number;
  minimum_term_weeks?: number;
  early_termination_fee?: number;
  start_date: string;
}

export const agreementService = {
  async createAgreement(payload: CreateAgreementPayload) {
    const { data } = await api.post('/admin/agreements', payload);
    return data;
  },

  async getAgreements(filters?: Record<string, string>): Promise<RentalAgreement[]> {
    const { data } = await api.get('/admin/agreements', { params: filters });
    return data;
  },

  async getAgreementDetail(id: string): Promise<RentalAgreement & { rental_payment_schedule: unknown[] }> {
    const { data } = await api.get(`/admin/agreements/${id}`);
    return data;
  },

  async terminateAgreement(id: string, reason: string): Promise<void> {
    await api.post(`/admin/agreements/${id}/terminate`, { reason });
  },
};
