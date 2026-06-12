import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [mode, setMode] = useState('login'); // login | register
  const [method, setMethod] = useState('email'); // email | phone
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [prefix, setPrefix] = useState('+33');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const PREFIXES = [
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+49', label: '🇩🇪 +49' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+39', label: '🇮🇹 +39' },
    { code: '+226', label: '🇧🇫 +226' },
    { code: '+225', label: '🇨🇮 +225' },
    { code: '+221', label: '🇸🇳 +221' },
    { code: '+212', label: '🇲🇦 +212' },
    { code: '+213', label: '🇩🇿 +213' },
    { code: '+216', label: '🇹🇳 +216' },
    { code: '+243', label: '🇨🇩 +243' },
    { code: '+237', label: '🇨🇲 +237' },
    { code: '+234', label: '🇳🇬 +234' },
    { code: '+27', label: '🇿🇦 +27' },
    { code: '+86', label: '🇨🇳 +86' },
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+55', label: '🇧🇷 +55' },
    { code: '+52', label: '🇲🇽 +52' },
  ];

  const resolveEmail = () => {
    if (method === 'email') return email.trim();
    // For phone: generate a deterministic email alias stored in profile
    const clean = phone.replace(/\s/g, '');
    return `${prefix.replace('+', '')}${clean}@yo-phone.app`;
  };

  const handleSubmit = async () => {
    setError('');
    const emailToUse = resolveEmail();
    if (!emailToUse || (method === 'email' && !emailToUse.includes('@'))) {
      setError('Adresse invalide.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: emailToUse,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          phone_number: method === 'phone' ? `${prefix}${phone.replace(/\s/g, '')}` : null,
          auth_method: method,
        }
      },
    });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="auth-page">
        <img src={logo} alt="Yo" className="auth-logo" />
        <h1 className="auth-title">Vérifiez votre email</h1>
        <p className="auth-subtitle">
          Un lien de connexion a été envoyé à<br />
          <strong>{resolveEmail()}</strong>.<br /><br />
          Cliquez sur le lien dans l'email pour vous connecter. Pas besoin de mot de passe.
        </p>
        <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setSent(false)}>
          Modifier l'adresse
        </button>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <img src={logo} alt="Yo" className="auth-logo" />
      <h1 className="auth-title">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
      <p className="auth-subtitle">
        {mode === 'login'
          ? 'Entrez votre email ou numéro, vous recevrez un lien magique.'
          : 'Rejoignez Yo en quelques secondes.'}
      </p>

      {/* Mode switch */}
      <div className="auth-switch-row" style={{ width: '100%' }}>
        <button className={`switch-tab ${method === 'email' ? 'active' : ''}`} onClick={() => setMethod('email')}>
          Email
        </button>
        <button className={`switch-tab ${method === 'phone' ? 'active' : ''}`} onClick={() => setMethod('phone')}>
          Téléphone
        </button>
      </div>

      {method === 'email' ? (
        <div className="input-group" style={{ width: '100%' }}>
          <label className="input-label">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoComplete="email"
          />
        </div>
      ) : (
        <div className="input-group" style={{ width: '100%' }}>
          <label className="input-label">Numéro de téléphone</label>
          <div className="phone-row">
            <select className="prefix-select" value={prefix} onChange={e => setPrefix(e.target.value)}>
              {PREFIXES.map(p => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
            <input
              className="input-field"
              type="tel"
              placeholder="6 12 34 56 78"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ flex: 1 }}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Un lien de connexion sera envoyé par email lié à ce numéro.
          </p>
        </div>
      )}

      {error && <p className="error-msg" style={{ width: '100%', marginTop: 0 }}>{error}</p>}

      <button className="btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Envoi...' : 'Continuer'}
      </button>

      <div className="auth-toggle">
        {mode === 'login' ? (
          <>Pas encore de compte ?{' '}<span onClick={() => setMode('register')}>S'inscrire</span></>
        ) : (
          <>Déjà un compte ?{' '}<span onClick={() => setMode('login')}>Se connecter</span></>
        )}
      </div>
    </div>
  );
}
