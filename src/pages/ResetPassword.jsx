import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import PasswordField from '../components/PasswordField';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) });
      setMessage(result.message); setPassword('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="login-layout reset-layout">
      <div className="login-photo"><div><p className="eyebrow">BISTRO ELEVEN</p><h1>A fresh start<br /><em>for your account.</em></h1></div></div>
      <section className="login-card">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h2>Create a new password</h2>
        <p className="muted">Choose a password with at least 8 characters.</p>
        <form autoComplete="on" onSubmit={handleSubmit}>
          <label htmlFor="reset-new-password">New password</label>
          <PasswordField id="reset-new-password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" />
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          {!message && <button className="button button-red" type="submit" disabled={busy || !token}>{busy ? 'Saving…' : 'Save new password'} <span>&rarr;</span></button>}
        </form>
        {message && <p className="switch-auth"><Link to="/login">Go to sign in</Link></p>}
      </section>
    </main>
  );
}
