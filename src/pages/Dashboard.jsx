import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Dashboard() {
  const { user, wallet, logout, fetchProfile } = useAuth();
  const [tab, setTab] = useState('send');
  const [providers, setProviders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ recipient: '', amount: '', note: '' });
  const [sending, setSending] = useState(false);
  const [lastTxn, setLastTxn] = useState(null);
  const [error, setError] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({ provider_id: '', account_number: '' });
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    client.get('/user/providers').then(r => setProviders(r.data.providers));
    client.get('/transfer/history').then(r => setTransactions(r.data.transactions));
    client.get('/accounts').then(r => setLinkedAccounts(r.data.accounts));
  }, []);

  const fetchAccounts = async () => {
    const res = await client.get('/accounts');
    setLinkedAccounts(res.data.accounts);
  };

  const handleLinkAccount = async () => {
    if (!newAccount.provider_id || !newAccount.account_number) return;
    setLinkingAccount(true);
    setLinkError('');
    try {
      await client.post('/accounts', newAccount);
      await fetchAccounts();
      setNewAccount({ provider_id: '', account_number: '' });
    } catch (err) {
      setLinkError(err.response?.data?.error || 'Could not link account');
    } finally {
      setLinkingAccount(false);
    }
  };

  const handleUnlinkAccount = async (id) => {
    await client.delete(`/accounts/${id}`);
    await fetchAccounts();
  };

  const fee = form.amount ? Math.round(parseFloat(form.amount) * 0.005) : 0;
  const total = form.amount ? parseFloat(form.amount) + fee : 0;

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const res = await client.post('/transfer/send', {
        from_provider: selectedFrom.id,
        to_provider: selectedTo.id,
        recipient: form.recipient,
        amount: parseFloat(form.amount),
        note: form.note,
      });
      setLastTxn(res.data);
      await fetchProfile();
      const history = await client.get('/transfer/history');
      setTransactions(history.data.transactions);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const resetSend = () => {
    setSelectedFrom(null);
    setSelectedTo(null);
    setForm({ recipient: '', amount: '', note: '' });
    setStep(1);
    setLastTxn(null);
    setError('');
  };

  return (
    <div style={s.page}>
      <div style={s.app}>

        <div style={s.header}>
          <div>
            <div style={s.logo}>Simple<span style={{ color: '#7edeab' }}>Pay</span></div>
            <div style={s.headerSub}>Unified Payments · Sierra Leone</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Welcome back</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {user?.full_name?.split(' ')[0]} {user?.full_name?.split(' ')[1]?.[0]}.
            </div>
            <button onClick={logout} style={s.logoutBtn}>Sign out</button>
          </div>
        </div>

        <div style={s.balanceBar}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>SimplePay Wallet</div>
            <div style={{ fontSize: '22px', fontWeight: 500 }}>
              NLe {wallet ? Number(wallet.balance).toLocaleString() : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Status</div>
            <div style={{ fontSize: '13px', color: '#7edeab' }}>● Verified</div>
          </div>
        </div>

        <div style={s.tabs}>
          {['send', 'accounts', 'history', 'network'].map(t => (
            <div key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        <div style={s.content}>

          {tab === 'send' && (
            <div>
              <div style={s.networkBadge}>● Network live — {providers.length} providers connected</div>
              <div style={s.stepBar}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ ...s.stepDot, background: step > n ? '#1a6b3c' : step === n ? '#7edeab' : '#ddd' }} />
                ))}
              </div>

              {error && <div style={s.errorBox}>{error}</div>}

              {step === 1 && (
                <>
                  <div style={s.sectionTitle}>From</div>
                  <div style={s.providerGrid}>
                    {providers.map(p => (
                      <div key={p.id} style={{ ...s.providerCard, ...(selectedFrom?.id === p.id ? s.providerSelected : {}) }} onClick={() => setSelectedFrom(p)}>
                        <div style={{ ...s.providerIcon, background: p.color }}>{p.short}</div>
                        <div style={s.providerName}>{p.name}</div>
                        <div style={s.providerType}>{p.type.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                  <div style={s.divider}>↓ to</div>
                  <div style={s.sectionTitle}>To</div>
                  <div style={s.providerGrid}>
                    {providers.map(p => (
                      <div key={p.id} style={{ ...s.providerCard, ...(selectedTo?.id === p.id ? s.providerSelected : {}) }} onClick={() => setSelectedTo(p)}>
                        <div style={{ ...s.providerIcon, background: p.color }}>{p.short}</div>
                        <div style={s.providerName}>{p.name}</div>
                        <div style={s.providerType}>{p.type.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                  <button style={{ ...s.btn, opacity: selectedFrom && selectedTo ? 1 : 0.5 }} disabled={!selectedFrom || !selectedTo} onClick={() => setStep(2)}>
                    Continue →
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
                    <strong>{selectedFrom?.name}</strong> → <strong>{selectedTo?.name}</strong>
                  </div>
                  <label style={s.label}>Recipient phone / account</label>
                  <input style={s.input} placeholder="077 123 456" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
                  <label style={s.label}>Amount (NLe)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={s.currencyBadge}>NLe</span>
                    <input style={{ ...s.input, flex: 1 }} type="number" placeholder="50" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Fee: 0.5% = NLe {fee.toLocaleString()} · Total: NLe {total.toLocaleString()}
                  </div>
                  <label style={s.label}>Note (optional)</label>
                  <input style={s.input} placeholder="e.g. School fees" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                  <button style={{ ...s.btn, opacity: form.recipient && form.amount ? 1 : 0.5 }} disabled={!form.recipient || !form.amount} onClick={() => setStep(3)}>
                    Review transfer →
                  </button>
                  <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={s.sectionTitle}>Confirm transfer</div>
                  <div style={s.receiptCard}>
                    {[
                      ['From', selectedFrom?.name],
                      ['To', selectedTo?.name],
                      ['Recipient', form.recipient],
                      ['Amount', `NLe ${Number(form.amount).toLocaleString()}`],
                      ['Fee (0.5%)', `NLe ${fee.toLocaleString()}`],
                      ['Total deducted', `NLe ${total.toLocaleString()}`],
                      ...(form.note ? [['Note', form.note]] : []),
                    ].map(([k, v]) => (
                      <div key={k} style={s.receiptRow}>
                        <span style={{ color: '#888' }}>{k}</span>
                        <span style={{ fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button style={s.btn} onClick={handleSend} disabled={sending}>
                    {sending ? 'Processing...' : 'Confirm & send 🔒'}
                  </button>
                  <button style={s.backBtn} onClick={() => setStep(2)}>← Back</button>
                </>
              )}

              {step === 4 && lastTxn && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={s.successIcon}>✓</div>
                  <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Transfer successful!</div>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
                    NLe {Number(lastTxn.amount).toLocaleString()} sent from {selectedFrom?.name} to {selectedTo?.name}
                  </div>
                  <div style={s.receiptCard}>
                    {[
                      ['Reference', lastTxn.reference],
                      ['Amount sent', `NLe ${Number(lastTxn.amount).toLocaleString()}`],
                      ['Total charged', `NLe ${Number(lastTxn.total_deducted).toLocaleString()}`],
                      ['New balance', `NLe ${Number(lastTxn.new_balance).toLocaleString()}`],
                      ['Status', '✓ Completed'],
                    ].map(([k, v]) => (
                      <div key={k} style={s.receiptRow}>
                        <span style={{ color: '#888' }}>{k}</span>
                        <span style={{ fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button style={s.btn} onClick={resetSend}>Send another transfer</button>
                </div>
              )}
            </div>
          )}

          {tab === 'accounts' && (
            <div>
              <div style={s.sectionTitle}>Link a new account</div>
              {linkError && <div style={s.errorBox}>{linkError}</div>}
              <label style={s.label}>Provider</label>
              <select
                style={s.input}
                value={newAccount.provider_id}
                onChange={e => setNewAccount({ ...newAccount, provider_id: e.target.value })}
              >
                <option value="">Select a provider</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label style={s.label}>Account / phone number</label>
              <input
                style={s.input}
                placeholder="e.g. 077 123 456"
                value={newAccount.account_number}
                onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })}
              />
              <button
                style={{ ...s.btn, opacity: newAccount.provider_id && newAccount.account_number ? 1 : 0.5 }}
                disabled={!newAccount.provider_id || !newAccount.account_number || linkingAccount}
                onClick={handleLinkAccount}
              >
                {linkingAccount ? 'Linking...' : 'Link account'}
              </button>

              <div style={{ ...s.sectionTitle, marginTop: '24px' }}>Your linked accounts</div>
              {linkedAccounts.length === 0 && <p style={{ color: '#888', fontSize: '14px' }}>No accounts linked yet.</p>}
              {linkedAccounts.map(acc => {
                const p = providers.find(pr => pr.id === acc.provider_id);
                return (
                  <div key={acc.id} style={s.txnItem}>
                    <div style={{ ...s.txnIcon, background: p?.color || '#1a6b3c' }}>{p?.short || '??'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{p?.name || acc.provider_id}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{acc.account_number} · ✓ Verified</div>
                    </div>
                    <button
                      onClick={() => handleUnlinkAccount(acc.id)}
                      style={{ background: 'none', border: 'none', color: '#a32d2d', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

         {tab === 'history' && (
            <div>
              <div style={s.sectionTitle}>Recent transactions</div>
              {transactions.length === 0 && (
                <p style={{ color: '#888', fontSize: '14px' }}>No transactions yet.</p>
              )}
              {transactions.map(t => {
                const isReceived = t.direction === 'received';
                return (
                  <div key={t.id} style={s.txnItem}>
                    <div style={{ ...s.txnIcon, background: isReceived ? '#1a6b3c' : '#888' }}>
                      {isReceived ? '↓' : t.to_provider.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        {isReceived ? `From ${t.receiver_identifier}` : t.receiver_identifier}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {isReceived ? `Received via ${t.to_provider}` : `${t.from_provider} → ${t.to_provider}`} · {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ color: isReceived ? '#1a6b3c' : '#a32d2d', fontWeight: 500, fontSize: '14px' }}>
                      {isReceived ? '+' : '-'}NLe {Number(t.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'network' && (
            <div>
              <div style={s.networkBadge}>● Live network</div>
              <div style={s.statGrid}>
                {[
                  ['Active providers', providers.length, 'Banks + MNOs'],
                  ['Avg settlement', '1.8s', 'Real-time rails'],
                ].map(([label, val, sub]) => (
                  <div key={label} style={s.statCard}>
                    <div style={{ fontSize: '11px', color: '#888' }}>{label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 500 }}>{val}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={s.sectionTitle}>Connected providers</div>
              <div style={s.providerGrid}>
                {providers.map(p => (
                  <div key={p.id} style={s.providerCard}>
                    <div style={{ ...s.providerIcon, background: p.color }}>{p.short}</div>
                    <div style={s.providerName}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: '#1a6b3c' }}>● Active</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f0f0', display: 'flex', justifyContent: 'center', padding: '20px 10px' },
  app: { width: '100%', maxWidth: '680px' },
  header: { background: '#1a6b3c', color: 'white', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '20px', fontWeight: 600, color: 'white' },
  headerSub: { fontSize: '12px', opacity: 0.7, marginTop: '2px' },
  logoutBtn: { fontSize: '11px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', marginTop: '4px' },
  balanceBar: { background: '#145c32', color: 'white', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tabs: { display: 'flex', background: 'white', borderBottom: '1px solid #eee' },
  tab: { flex: 1, padding: '12px 8px', textAlign: 'center', fontSize: '13px', cursor: 'pointer', color: '#888', borderBottom: '2px solid transparent' },
  tabActive: { color: '#1a6b3c', borderBottomColor: '#1a6b3c', fontWeight: 500 },
  content: { background: 'white', borderRadius: '0 0 12px 12px', padding: '20px', border: '1px solid #eee', borderTop: 'none' },
  networkBadge: { display: 'inline-block', background: '#e6f7ed', color: '#1a6b3c', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', marginBottom: '12px' },
  stepBar: { display: 'flex', gap: '6px', marginBottom: '20px' },
  stepDot: { flex: 1, height: '3px', borderRadius: '2px' },
  sectionTitle: { fontSize: '11px', fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' },
  providerGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
  providerCard: { border: '1.5px solid #eee', borderRadius: '8px', padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: 'white' },
  providerSelected: { borderColor: '#1a6b3c', background: '#e6f7ed' },
  providerIcon: { width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: 'white' },
  providerName: { fontSize: '11px', fontWeight: 500, lineHeight: 1.3 },
  providerType: { fontSize: '10px', color: '#888', marginTop: '2px' },
  divider: { textAlign: 'center', color: '#888', fontSize: '13px', margin: '8px 0 16px' },
  label: { display: 'block', fontSize: '13px', color: '#555', margin: '12px 0 6px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  currencyBadge: { background: '#e6f7ed', color: '#1a6b3c', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid #a8dfc0', whiteSpace: 'nowrap' },
  btn: { width: '100%', padding: '13px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', marginTop: '12px' },
  backBtn: { width: '100%', padding: '11px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' },
  receiptCard: { background: '#f8f8f8', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' },
  receiptRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #eee' },
  txnItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '8px' },
  txnIcon: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', flexShrink: 0 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  statCard: { background: '#f8f8f8', borderRadius: '8px', padding: '12px' },
  successIcon: { width: '60px', height: '60px', borderRadius: '50%', background: '#e6f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: '#1a6b3c' },
  errorBox: { background: '#fde8e8', color: '#a32d2d', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
};