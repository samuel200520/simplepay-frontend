import React, { useState, useEffect } from 'react';
import axios from 'axios';

const adminClient = axios.create({
  baseURL: 'https://simplepay-aqqv.onrender.com/api',
});

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('simplepay_admin_token') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (token) fetchTransactions();
  }, [token]);

  const fetchTransactions = async () => {
    try {
      const res = await adminClient.get('/admin/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(res.data.transactions);
    } catch (err) {
      setError('Session expired. Please log in again.');
      handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminClient.post('/admin/login', { password });
      localStorage.setItem('simplepay_admin_token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError('Incorrect admin password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('simplepay_admin_token');
    setToken('');
    setTransactions([]);
  };

  const handleReverse = async (reference) => {
    if (!window.confirm(`Reverse transaction ${reference}? This will refund the sender.`)) return;
    setActionMsg('');
    try {
      await adminClient.post(`/admin/transactions/${reference}/reverse`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActionMsg(`Transaction ${reference} reversed successfully.`);
      fetchTransactions();
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not reverse transaction.');
    }
  };

  if (!token) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>Simple<span style={{ color: '#1a6b3c' }}>Pay</span> Admin</h1>
          <p style={styles.subtitle}>Operations dashboard</p>
          {error && <div style={styles.errorBox}>{error}</div>}
          <form onSubmit={handleLogin}>
            <label style={styles.label}>Admin password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Simple<span style={{ color: '#1a6b3c' }}>Pay</span> Admin</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign out</button>
      </div>

      {actionMsg && <div style={styles.actionMsg}>{actionMsg}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Reference</th>
              <th style={styles.th}>Sender</th>
              <th style={styles.th}>Recipient</th>
              <th style={styles.th}>Route</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={styles.td}>{t.reference}</td>
                <td style={styles.td}>{t.sender_name || '—'}</td>
                <td style={styles.td}>{t.receiver_identifier}</td>
                <td style={styles.td}>{t.from_provider} → {t.to_provider}</td>
                <td style={styles.td}>NLe {Number(t.amount).toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    background: t.status === 'reversed' ? '#fde8e8' : '#e6f7ed',
                    color: t.status === 'reversed' ? '#a32d2d' : '#1a6b3c',
                  }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(t.created_at).toLocaleString()}</td>
                <td style={styles.td}>
                  {t.status !== 'reversed' && (
                    <button onClick={() => handleReverse(t.reference)} style={styles.reverseBtn}>
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  loginCard: { background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '380px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' },
  logo: { fontSize: '20px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: '#888', marginBottom: '1.5rem' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', marginTop: '12px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', background: '#1a6b3c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '1.5rem' },
  errorBox: { background: '#fde8e8', color: '#a32d2d', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' },
  page: { minHeight: '100vh', background: '#f5f5f5', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  logoutBtn: { padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  actionMsg: { background: '#e6f7ed', color: '#1a6b3c', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' },
  tableWrap: { background: 'white', borderRadius: '12px', overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #eee', color: '#888', fontWeight: '500', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' },
  statusBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  reverseBtn: { padding: '6px 12px', background: '#fde8e8', color: '#a32d2d', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
};