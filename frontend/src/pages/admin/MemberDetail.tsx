import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { memberService } from '../../services/memberService';
import { Member } from '../../types';
import FileUpload from '../../components/shared/FileUpload';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [docUrls, setDocUrls] = useState<{ license_url: string | null; bank_statement_url: string | null } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    Promise.all([
      memberService.getMemberDetail(id!),
      memberService.getMemberDocuments(id!),
    ]).then(([m, docs]) => {
      setMember(m);
      setDocUrls(docs);
      setLoading(false);
    });
  }, [id]);

  async function approve() {
    await memberService.approveMember(id!);
    setMember((prev) => prev ? { ...prev, approval_status: 'approved' } : prev);
    toast.success('Member approved');
  }

  async function reject() {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    await memberService.rejectMember(id!, rejectReason);
    setMember((prev) => prev ? { ...prev, approval_status: 'rejected', rejection_reason: rejectReason } : prev);
    setShowRejectForm(false);
    toast.info('Member rejected');
  }

  async function uploadLicense(file: File) {
    await memberService.uploadDriverLicense(id!, file);
    toast.success('Driver license uploaded');
  }

  async function uploadBank(file: File) {
    await memberService.uploadBankStatement(id!, file);
    toast.success('Bank statement uploaded');
  }

  if (loading) return <LoadingSpinner />;
  if (!member) return <p>Member not found</p>;

  const Detail = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{member.first_name} {member.last_name}</h1>
        </div>
        {member.approval_status === 'approved' && (
          <Link to={`/admin/agreements/new?member_id=${id}`} className="btn-primary">Assign Vehicle</Link>
        )}
      </div>

      {member.approval_status === 'pending_approval' && (
        <div className="rounded-md bg-yellow-50 border border-yellow-300 p-4 space-y-3">
          <p className="font-medium text-yellow-800">This member is awaiting approval</p>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button onClick={approve} className="btn-primary">Approve</button>
              <button onClick={() => setShowRejectForm(true)} className="btn-danger">Reject</button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                className="form-input"
                rows={3}
              />
              <div className="flex gap-3">
                <button onClick={reject} className="btn-danger">Confirm Rejection</button>
                <button onClick={() => setShowRejectForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {member.approval_status === 'rejected' && member.rejection_reason && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4">
          <p className="font-medium text-red-800">Rejected: {member.rejection_reason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Personal Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Email" value={member.email} />
            <Detail label="Mobile" value={member.mobile} />
            <Detail label="Date of Birth" value={member.dob ? format(new Date(member.dob), 'dd/MM/yyyy') : undefined} />
            <Detail label="License Number" value={member.drivers_license_number} />
            <Detail label="Medicare Number" value={member.medicare_number} />
          </div>
          <Detail label="Address" value={member.address} />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Employment & Banking</h2>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Employer" value={member.employer_name} />
            <Detail label="Employer Phone" value={member.employer_phone} />
            <Detail label="Bank Account Name" value={member.bank_account_name} />
            <Detail label="BSB" value={member.bank_bsb} />
            <Detail label="Account Number" value={member.bank_account_number} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Documents</h2>
          <div className="space-y-3">
            {docUrls?.license_url ? (
              <a href={docUrls.license_url} target="_blank" rel="noreferrer" className="btn-secondary block text-center">
                View Driver License
              </a>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-1">Driver License</p>
                <FileUpload onFile={uploadLicense} label="Upload driver license" />
              </div>
            )}
            {docUrls?.bank_statement_url ? (
              <a href={docUrls.bank_statement_url} target="_blank" rel="noreferrer" className="btn-secondary block text-center">
                View Bank Statement
              </a>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-1">Bank Statement</p>
                <FileUpload onFile={uploadBank} label="Upload bank statement" />
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Status</h2>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Member Status" value={member.member_status} />
            <Detail label="Approval Status" value={member.approval_status.replace('_', ' ')} />
            <Detail label="Joined" value={format(new Date(member.created_at), 'dd/MM/yyyy')} />
          </div>
        </div>
      </div>
    </div>
  );
}
