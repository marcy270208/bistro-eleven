import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { uploadImageFile } from '../lib/imageUpload';
import PasswordField from '../components/PasswordField';

export default function AccountSettings({ user, token, setUser }) {
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', emailVerified: user?.emailVerified || false, phone: user?.phone || '', address: user?.address || '', photo: user?.photo || null });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const handlePhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileError('');
    setProfileMessage('');
    setUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadImageFile(file, token);
      setProfile(current => ({ ...current, photo: uploadedUrl }));
      setProfileMessage('Foto berhasil diunggah ke cloud storage. Klik Save profile untuk menyimpan ke akun.');
    } catch (error) {
      setProfileError(error.message || 'Gagal mengunggah foto profil.');
      event.target.value = '';
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async event => {
    event.preventDefault(); setBusy(true); setProfileError(''); setProfileMessage('');
    try {
      const updatedUser = await api('/api/auth/profile', { method: 'PUT', token, body: JSON.stringify(profile) });
      setUser(updatedUser); setProfile(updatedUser); setProfileMessage('Pengaturan akun berhasil disimpan.');
    } catch (error) { setProfileError(error.message); }
    finally { setBusy(false); }
  };

  const changePassword = async event => {
    event.preventDefault(); setBusy(true); setPasswordError(''); setPasswordMessage('');
    try {
      const result = await api('/api/auth/password', { method: 'PUT', token, body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword(''); setNewPassword(''); setPasswordMessage(result.message);
    } catch (error) { setPasswordError(error.message); }
    finally { setBusy(false); }
  };

  const sendVerification = async () => {
    setEmailError(''); setEmailMessage(''); setBusy(true);
    try {
      const result = await api('/api/auth/email/send-verification', { method: 'POST', token });
      setEmailMessage(result.message);
    } catch (error) { setEmailError(error.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="account-page">
      <div className="order-intro"><p className="eyebrow">YOUR BISTRO ELEVEN ACCOUNT</p><h1>Account settings</h1><p className="muted">Update your profile and account password.</p></div>
      <section className="account-card">
        <h2>Profile details</h2>
        <form className="account-form" onSubmit={saveProfile}>
          <div className="account-photo-preview">
            {profile.photo ? <img src={profile.photo} alt="Profile preview" /> : <span>{(profile.name || 'G').charAt(0).toUpperCase()}</span>}
          </div>
          <label htmlFor="profile-photo">Profile photo</label>
          <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} disabled={uploadingPhoto || busy} />
          {uploadingPhoto && <small className="muted">Mengompres & mengunggah foto ke cloud storage...</small>}
          {profile.photo && profile.photo.startsWith('http') && <small className="verified-label" style={{ wordBreak: 'break-all' }}>Cloud URL: {profile.photo}</small>}
          <label htmlFor="profile-name">Name</label>
          <input id="profile-name" required maxLength={80} value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} />
          <label htmlFor="profile-username">Username</label>
          <input id="profile-username" value={user.username} readOnly />
          <label htmlFor="profile-email">Email address</label>
          <input id="profile-email" type="email" required autoComplete="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value, emailVerified: profile.email === event.target.value ? profile.emailVerified : false })} />
          <small className={profile.emailVerified ? 'verified-label' : 'unverified-label'}>{profile.emailVerified ? 'Email verified' : 'Email not verified — verify it to reset your password by email.'}</small>
          {profile.email && !profile.emailVerified && profile.email.toLowerCase() === (user.email || '').toLowerCase() && <button className="text-action" type="button" onClick={sendVerification} disabled={busy}>Send verification email</button>}
          {profile.email && !profile.emailVerified && profile.email.toLowerCase() !== (user.email || '').toLowerCase() && <small className="unverified-label">Save your new email before requesting verification.</small>}
          {emailError && <p className="error" role="alert">{emailError}</p>}
          {emailMessage && <p className="success-message" role="status">{emailMessage}</p>}
          <label htmlFor="profile-phone">Phone</label>
          <input id="profile-phone" type="tel" maxLength={30} value={profile.phone} onChange={event => setProfile({ ...profile, phone: event.target.value })} />
          <label htmlFor="profile-address">Delivery address</label>
          <textarea id="profile-address" rows="3" maxLength={500} value={profile.address} onChange={event => setProfile({ ...profile, address: event.target.value })} />
          {profileError && <p className="error" role="alert">{profileError}</p>}
          {profileMessage && <p className="success-message" role="status">{profileMessage}</p>}
          <button className="button button-red" disabled={busy || uploadingPhoto}>Save profile</button>
        </form>
      </section>
      <section className="account-card">
        <h2>Change password</h2>
        <form className="account-form" onSubmit={changePassword}>
          <label htmlFor="current-password">Current password</label>
          <PasswordField id="current-password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="Enter current password" />
          <label htmlFor="new-password">New password</label>
          <PasswordField id="new-password" autoComplete="new-password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
          {passwordError && <p className="error" role="alert">{passwordError}</p>}
          {passwordMessage && <p className="success-message" role="status">{passwordMessage}</p>}
          <button className="button button-red" disabled={busy}>Update password</button>
        </form>
      </section>
    </main>
  );
}
