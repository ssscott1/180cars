import api from './api';
import { Member } from '../types';

export const memberService = {
  async getMembers(filters?: Record<string, string>): Promise<Member[]> {
    const { data } = await api.get('/admin/members', { params: filters });
    return data;
  },

  async getMemberDetail(id: string): Promise<Member> {
    const { data } = await api.get(`/admin/members/${id}`);
    return data;
  },

  async approveMember(id: string): Promise<void> {
    await api.post(`/admin/members/approve/${id}`);
  },

  async rejectMember(id: string, reason: string): Promise<void> {
    await api.post(`/admin/members/reject/${id}`, { reason });
  },

  async uploadDriverLicense(memberId: string, file: File): Promise<{ path: string }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/admin/members/${memberId}/driver-license`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async uploadBankStatement(memberId: string, file: File): Promise<{ path: string }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/admin/members/${memberId}/bank-statement`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getMemberDocuments(id: string): Promise<{ license_url: string | null; bank_statement_url: string | null }> {
    const { data } = await api.get(`/admin/members/${id}/documents`);
    return data;
  },
};
