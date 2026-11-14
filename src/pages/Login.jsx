import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import PasswordField from '../components/PasswordField';
import { useLanguage } from '../lib/i18n';

const Login = ({ onAuthenticated, user }) => {
  const { isId } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [error, setError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onAuthenticated(
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.trim(), password }),
        })
      );
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSignupError('');
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          username: signupUsername.trim(),
          password: signupPassword,
        }),
      });
      onAuthenticated(
        await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: signupUsername.trim(), password: signupPassword }),
        })
      );
      navigate('/');
    } catch (err) {
      setSignupError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const result = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotMessage(result.message);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (user) return <Navigate to="/" replace />;

  return (
    <main className="login-layout">
      <div className="login-photo">
        <div>
          <p className="eyebrow">{isId ? 'MEJAMU SUDAH SIAP' : 'YOUR TABLE IS READY'}</p>
          <h1>
            {isId ? (
              <>
                Hidangan lezat
                <br />
                <em>dimulai di sini.</em>
              </>
            ) : (
              <>
                Good food
                <br />
                <em>starts here.</em>
              </>
            )}
          </h1>
        </div>
      </div>
      <section className="login-card">
        <p className="eyebrow">BISTRO ELEVEN</p>

        {isLogin ? (
          isForgot ? (
            <div id="forgot-password-panel">
              <h2>{isId ? 'Reset kata sandi' : 'Reset password'}</h2>
              <p className="muted">
                {isId
                  ? 'Masukkan alamat email terverifikasi pada akunmu. Kami akan mengirimkan tautan reset.'
                  : 'Enter the verified email on your account. We’ll send a one-time reset link.'}
              </p>
              <form autoComplete="on" onSubmit={handleForgotPassword}>
                <label htmlFor="forgot-email">{isId ? 'Alamat email' : 'Email address'}</label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                {forgotError && (
                  <p className="error" role="alert">
                    {forgotError}
                  </p>
                )}
                {forgotMessage && (
                  <p className="success-message" role="status">
                    {forgotMessage}
                  </p>
                )}
                <button className="button button-red" type="submit" disabled={busy}>
                  {busy
                    ? isId
                      ? 'Mengirim…'
                      : 'Sending…'
                    : isId
                      ? 'Kirim tautan reset'
                      : 'Send reset link'}{' '}
                  <span>&rarr;</span>
                </button>
              </form>
              <p className="switch-auth">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    setForgotMessage('');
                    setForgotError('');
                  }}
                >
                  {isId ? 'Kembali ke halaman masuk' : 'Back to sign in'}
                </button>
              </p>
            </div>
          ) : (
            <div id="login-panel">
              <h2>{isId ? 'Selamat datang kembali' : 'Welcome back'}</h2>
              <p className="muted">
                {isId
                  ? 'Masuk untuk melanjutkan ke restoran.'
                  : 'Sign in to continue to the restaurant.'}
              </p>
              <form id="login-form" autoComplete="on" onSubmit={handleLogin}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder={isId ? 'Masukkan username kamu' : 'Enter your username'}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <label htmlFor="password">{isId ? 'Kata sandi' : 'Password'}</label>
                <PasswordField
                  id="password"
                  autoComplete="current-password"
                  placeholder={isId ? 'Masukkan kata sandi' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <p id="login-error" className="error" aria-live="polite">
                  {error}
                </p>

                <button className="button button-red" type="submit" disabled={busy}>
                  {isId ? 'Masuk' : 'Sign in'} <span>&rarr;</span>
                </button>
              </form>
              <p className="switch-auth">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(username.includes('@') ? username : '');
                    setIsForgot(true);
                    setError('');
                  }}
                >
                  {isId ? 'Lupa kata sandi?' : 'Forgot password?'}
                </button>
              </p>

              <p className="switch-auth">
                {isId ? 'Baru di Bistro Eleven? ' : 'New to Bistro Eleven? '}
                <button type="button" onClick={() => setIsLogin(false)}>
                  {isId ? 'Buat akun baru' : 'Create an account'}
                </button>
              </p>
            </div>
          )
        ) : (
          <div id="signup-panel">
            <h2>{isId ? 'Buat akun' : 'Create account'}</h2>
            <p className="muted">
              {isId
                ? 'Pilih username dan kata sandi untuk akunmu.'
                : 'Choose your own username and password.'}
            </p>
            <form id="signup-form" autoComplete="on" onSubmit={handleSignup}>
              <label htmlFor="signup-name">{isId ? 'Nama lengkap' : 'Your name'}</label>
              <input
                id="signup-name"
                name="name"
                autoComplete="name"
                placeholder={isId ? 'Masukkan namamu' : 'Enter your name'}
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />

              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                name="username"
                autoComplete="username"
                placeholder={isId ? 'Pilih username' : 'Choose a username'}
                required
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />

              <label htmlFor="signup-email">{isId ? 'Alamat email' : 'Email address'}</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={isId ? 'Masukkan emailmu' : 'Enter your email'}
                required
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
              />

              <label htmlFor="signup-password">{isId ? 'Kata sandi' : 'Password'}</label>
              <PasswordField
                id="signup-password"
                autoComplete="new-password"
                placeholder={isId ? 'Minimal 8 karakter' : 'Choose a password'}
                minLength={8}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />

              <p id="signup-error" className="error" aria-live="polite">
                {signupError}
              </p>

              <button className="button button-red" type="submit" disabled={busy}>
                {isId ? 'Buat akun' : 'Create account'} <span>&rarr;</span>
              </button>
            </form>

            <p className="switch-auth">
              {isId ? 'Sudah punya akun? ' : 'Already have an account? '}
              <button type="button" onClick={() => setIsLogin(true)}>
                {isId ? 'Masuk' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Login;
