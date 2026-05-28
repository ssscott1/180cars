import api from './api';
import { Vehicle } from '../types';

export const vehicleService = {
  async getVehicles(filters?: Record<string, string>): Promise<Vehicle[]> {
    const { data } = await api.get('/admin/vehicles', { params: filters });
    return data;
  },

  async getVehicleDetail(id: string): Promise<Vehicle> {
    const { data } = await api.get(`/admin/vehicles/${id}`);
    return data;
  },

  async createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const { data } = await api.post('/admin/vehicles', vehicleData);
    return data;
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data } = await api.put(`/admin/vehicles/${id}`, updates);
    return data;
  },

  async uploadInvoice(vehicleId: string, file: File): Promise<{ path: string }> {
    const form = new FormData();
    form.append('invoice', file);
    const { data } = await api.post(`/admin/vehicles/${vehicleId}/invoice`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getInvoiceUrl(vehicleId: string): Promise<string> {
    const { data } = await api.get(`/admin/vehicles/${vehicleId}/invoice`);
    return data.url;
  },
};
