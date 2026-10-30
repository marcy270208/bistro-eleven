import { useState } from 'react';

export default function PasswordField({ id, value, onChange, autoComplete, minLength, required = true, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        placeholder={placeholder}
      />
      <button className="password-visibility" type="button" onClick={() => setVisible(current => !current)} aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}>
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.8 10.8 0 0112 5c5.3 0 9 5.4 9 7a8.5 8.5 0 01-2.6 3.6M6.2 6.3C3.9 7.8 3 10.7 3 12c0 1.6 3.7 7 9 7 1.3 0 2.5-.4 3.5-1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.2-7 9-7 9 7 9 7-3.2 7-9 7-9-7-9-7z" /><circle cx="12" cy="12" r="2.5" /></svg>
        )}
      </button>
    </div>
  );
}
