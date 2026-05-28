import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { memberService } from '../../services/memberService';
import { Member, ApprovalStatus } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const approvalColors: Record<ApprovalStatus, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved:         'bg-green-100 text-green-800',
  rejected:         'bg-red-100 text-red-800',
};

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const approvalStatus = searchParams.get('approval_status') ?? '';
  const memberStatus = searchParams.get('status') ?? '';

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (approvalStatus) filters.approval_status = approvalStatus;
    if (memberStatus) filters.status = memberStatus;
    memberService.getMembers(filters).then((m) => { setMembers(m); setLoading(false); });
  }, [approvalStatus, memberStatus]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <Link to="/admin/members/new" className="btn-primary">+ Add Member</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 self-center">Approval:</span>
        {['', 'pending_approval', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => setFilter('approval_status', s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              approvalStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {s ? s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Mobile', 'Status', 'Approval', 'Applied', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No members found</td></tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{m.first_name} {m.last_name}</td>
                  <td className="px-4 py-3 text-sm">{m.email}</td>
                  <td className="px-4 py-3 text-sm">{m.mobile ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-700 capitalize">{m.member_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${approvalColors[m.approval_status]}`}>
                      {m.approval_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleDateString('en-AU')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/admin/members/${m.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
