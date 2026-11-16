import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../lib/api';
import { deleteToken, saveToken } from '../lib/storage';
import { COLORS } from '../theme';

export default function AccountScreen({
  token,
  user,
  lang,
  onAuthSuccess,
  onLogout,
  onUserUpdated,
}) {
  const isId = lang === 'id';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState({ type: '', text: '' });

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    photo: user?.photo || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      photo: user?.photo || '',
    });
  }, [user]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setAuthMsg({
        type: 'error',
        text: isId ? 'Isi username dan password.' : 'Enter username and password.',
      });
      return;
    }
    setBusy(true);
    setAuthMsg({ type: '', text: '' });
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      await saveToken(data.token);
      setPassword('');
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setAuthMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal masuk' : 'Login failed'),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      setAuthMsg({
        type: 'error',
        text: isId ? 'Lengkapi semua kolom.' : 'Please fill in all fields.',
      });
      return;
    }
    setBusy(true);
    setAuthMsg({ type: '', text: '' });
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        }),
      });
      if (data.token && data.user) {
        await saveToken(data.token);
        setPassword('');
        onAuthSuccess(data.token, data.user);
      } else {
        setMode('login');
        setPassword('');
        setAuthMsg({
          type: 'success',
          text: isId ? 'Akun dibuat! Silakan masuk.' : 'Account created! Please sign in.',
        });
      }
    } catch (err) {
      setAuthMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal mendaftar' : 'Registration failed'),
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setProfileMsg({
        type: 'error',
        text: isId ? 'Izin galeri ditolak.' : 'Photo library permission denied.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const dataUri = `data:${mime};base64,${asset.base64}`;

    setUploading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const up = await api('/api/upload', {
        token,
        method: 'POST',
        body: JSON.stringify({ image: dataUri }),
      });
      const updated = await api('/api/auth/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify({ ...profile, photo: up.url }),
      });
      onUserUpdated(updated);
      setProfileMsg({
        type: 'success',
        text: isId ? 'Foto profil diperbarui!' : 'Profile photo updated!',
      });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal mengunggah foto' : 'Failed to upload photo'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const updated = await api('/api/auth/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify({ ...profile, photo: null }),
      });
      onUserUpdated(updated);
      setProfileMsg({
        type: 'success',
        text: isId ? 'Foto profil berhasil dihapus!' : 'Profile photo removed!',
      });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal menghapus foto' : 'Failed to remove photo'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const updated = await api('/api/auth/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      onUserUpdated(updated);
      setProfileMsg({
        type: 'success',
        text: isId ? 'Profil tersimpan!' : 'Profile saved!',
      });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.message || (isId ? 'Gagal menyimpan profil' : 'Failed to save profile'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await deleteToken();
    onLogout();
  };

  if (!token) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>{isId ? 'AKUN PELANGGAN' : 'GUEST ACCOUNT'}</Text>
          <Text style={styles.title}>
            {mode === 'login'
              ? isId
                ? 'Masuk ke Bistro Eleven'
                : 'Sign in to Bistro Eleven'
              : isId
              ? 'Buat Akun Baru'
              : 'Create an Account'}
          </Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
              onPress={() => {
                setMode('login');
                setAuthMsg({ type: '', text: '' });
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                {isId ? 'Masuk' : 'Sign In'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
              onPress={() => {
                setMode('register');
                setAuthMsg({ type: '', text: '' });
              }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                {isId ? 'Daftar' : 'Register'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {mode === 'register' ? (
              <>
                <Text style={styles.label}>{isId ? 'Nama Lengkap' : 'Full Name'}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Marcy Priscilla"
                  placeholderTextColor={COLORS.muted}
                />
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            ) : null}

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />

            {authMsg.text ? (
              <Text
                style={[
                  styles.feedback,
                  authMsg.type === 'error' ? styles.errorText : styles.successText,
                ]}
              >
                {authMsg.text}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={mode === 'login' ? handleLogin : handleRegister}
              disabled={busy}
            >
              <Text style={styles.primaryBtnText}>
                {busy
                  ? isId
                    ? 'Memproses...'
                    : 'Please wait...'
                  : mode === 'login'
                  ? isId
                    ? 'Masuk'
                    : 'Sign In'
                  : isId
                  ? 'Daftar Sekarang'
                  : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>{isId ? 'PENGATURAN AKUN' : 'ACCOUNT SETTINGS'}</Text>
        <Text style={styles.title}>{user?.name || user?.username || 'Profile'}</Text>

        <View style={styles.avatarRow}>
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userHandle}>@{user?.username}</Text>
            <Text style={styles.userRole}>{user?.role || 'client'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handlePickPhoto}
                disabled={uploading}
              >
                <Text style={styles.photoBtnText}>
                  {uploading
                    ? isId
                      ? 'Memproses...'
                      : 'Processing...'
                    : isId
                    ? 'Ganti Foto Profil'
                    : 'Change Profile Photo'}
                </Text>
              </TouchableOpacity>
              {profile.photo ? (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={handleRemovePhoto}
                  disabled={uploading}
                >
                  <Text style={styles.removePhotoBtnText}>
                    {isId ? 'Hapus Foto' : 'Remove Photo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{isId ? 'Nama' : 'Name'}</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={profile.email}
            onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{isId ? 'Nomor Telepon' : 'Phone'}</Text>
          <TextInput
            style={styles.input}
            value={profile.phone}
            onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>{isId ? 'Alamat Pengantaran' : 'Delivery Address'}</Text>
          <TextInput
            style={[styles.input, { minHeight: 72 }]}
            value={profile.address}
            onChangeText={(v) => setProfile((p) => ({ ...p, address: v }))}
            multiline
            textAlignVertical="top"
          />

          {profileMsg.text ? (
            <Text
              style={[
                styles.feedback,
                profileMsg.type === 'error' ? styles.errorText : styles.successText,
              ]}
            >
              {profileMsg.text}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>
              {saving
                ? isId
                  ? 'Menyimpan...'
                  : 'Saving...'
                : isId
                ? 'Simpan Profil'
                : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>{isId ? 'Keluar' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.paper },
  content: { padding: 16, paddingBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: COLORS.accent },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.ink, marginTop: 2, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  tabBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 6 },
  input: {
    minHeight: 46,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
    marginBottom: 12,
  },
  feedback: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  errorText: { color: COLORS.danger },
  successText: { color: COLORS.success },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 16,
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.soft },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 28, fontWeight: '700' },
  userHandle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  userRole: { fontSize: 12, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 },
  photoBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignSelf: 'flex-start',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  removePhotoBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  removePhotoBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  logoutBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
});
