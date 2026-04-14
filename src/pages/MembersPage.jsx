import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { getMembers, approveMember, rejectMember, renewMember, sendReminders } from '../lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

function statusVariant(status, isExpired) {
  if (isExpired) return 'destructive';
  return { approved: 'default', pending: 'secondary', rejected: 'outline' }[status] ?? 'secondary';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(expiresAt) {
  return expiresAt && new Date(expiresAt) < new Date();
}

export default function MembersPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [busy, setBusy] = useState({});
  const [reminding, setReminding] = useState(false);

  async function remind() {
    setReminding(true);
    try {
      const { sent, skipped } = await sendReminders(token);
      if (sent === 0) toast.info(`No reminders due. ${skipped} member(s) not yet eligible.`);
      else toast.success(`${sent} reminder email${sent === 1 ? '' : 's'} sent.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReminding(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMembers(await getMembers(token));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function act(id, fn, label) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await fn(token, id);
      await load();
      toast.success(label);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  const uniqueStates = [...new Set(members.map(m => m.state).filter(Boolean))].sort();

  const stateMembers = stateFilter ? members.filter(m => m.state === stateFilter) : members;

  const filtered = stateMembers
    .filter(m => {
      if (filter === 'expired') return isExpired(m.expires_at);
      if (filter !== 'all') return m.status === filter;
      return true;
    })
    .filter(m => !search || m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search));

  const counts = {
    total:    stateMembers.length,
    pending:  stateMembers.filter(m => m.status === 'pending').length,
    approved: stateMembers.filter(m => m.status === 'approved').length,
    rejected: stateMembers.filter(m => m.status === 'rejected').length,
    expired:  stateMembers.filter(m => isExpired(m.expires_at)).length,
  };

  const STAT_CARDS = [
    { label: 'Total',    key: 'all',      value: counts.total },
    { label: 'Pending',  key: 'pending',  value: counts.pending,  cls: 'text-amber-600' },
    { label: 'Approved', key: 'approved', value: counts.approved, cls: 'text-green-700' },
    { label: 'Rejected', key: 'rejected', value: counts.rejected, cls: 'text-red-600' },
    { label: 'Expired',  key: 'expired',  value: counts.expired,  cls: 'text-red-500' },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={remind} disabled={reminding}>
            {reminding ? 'Sending…' : '✉ Send Reminders'}
          </Button>
          <Button variant="outline" size="sm" onClick={load}>↻ Refresh</Button>
        </div>
      </div>

      {/* Stats — click to filter */}
      <div className="flex gap-3 flex-wrap">
        {STAT_CARDS.map(({ label, key, value, cls }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg border px-4 py-2 text-center min-w-20 transition-colors cursor-pointer
              ${ filter === key
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white hover:bg-slate-50'
              }`}
          >
            <div className={`text-2xl font-bold ${filter === key ? '' : (cls ?? '')}`}>{value}</div>
            <div className={`text-xs ${filter === key ? 'text-slate-300' : 'text-muted-foreground'}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All states</option>
          {uniqueStates.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Input
          placeholder="Search name or email…"
          className="max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value.toLowerCase())}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && !filtered.length && (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No members found.</TableCell></TableRow>
            )}
            {filtered.map(m => {
              const expired = isExpired(m.expires_at);
              const isBusy = busy[m.id];
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a></TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(m.status, expired)}>
                      {expired ? 'expired' : m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtDate(m.created_at)}</TableCell>
                  <TableCell className="text-sm">{m.occupation || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {m.city || m.state || m.pincode
                      ? <>{m.city}{m.city && m.state ? ', ' : ''}{m.state}{m.pincode ? <span className="text-muted-foreground"> {m.pincode}</span> : ''}</>
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{m.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtDate(m.approved_at)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtDate(m.expires_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {m.status !== 'approved' && (
                        <Button size="sm" variant="outline" disabled={isBusy}
                          className="text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => act(m.id, approveMember, 'Member approved.')}>
                          Approve
                        </Button>
                      )}
                      {(m.status === 'approved' || expired) && (
                        <Button size="sm" variant="outline" disabled={isBusy}
                          className="text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => act(m.id, renewMember, 'Membership renewed.')}>
                          Renew
                        </Button>
                      )}
                      {m.status !== 'rejected' && (
                        <Button size="sm" variant="outline" disabled={isBusy}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => act(m.id, rejectMember, 'Member rejected.')}>
                          Reject
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {members.length} members</p>
    </div>
  );
}
