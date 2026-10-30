import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function VerifyEmail({ token: sessionToken, setUser }) {
  const [searchParams] = useSearchParams();
  const verificationToken = searchParams.get('token') || '';
  const [message, setMessage] = useState('Checking your verification link…');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api(`/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`)
      .then(async result => {
        if (!active) return;
        setMessage(result.message);
        if (sessionToken) {
          try { setUser(await api('/api/auth/me', { token: sessionToken })); } catch { /* The email is verified even if this browser is signed out. */ }
        }
      })
      .catch(err => { if (active) { setError(err.message); setMessage(''); } });
    return () => { active = false; };
  }, [verificationToken, sessionToken, setUser]);

  return (
    <main className="verification-page">
      <section className="account-card">
        <p className="eyebrow">BISTRO ELEVEN</p>
        <h1>Email verification</h1>
        {error ? <p className="error" role="alert">{error}</p> : <p className="success-message" role="status">{message}</p>}
        <Link className="button button-red" to={sessionToken ? '/account' : '/login'}>{sessionToken ? 'Back to account settings' : 'Sign in'} <span>&rarr;</span></Link>
      </section>
    </main>
  );
}
