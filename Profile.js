import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setLoading(true);
    let avatar_url = profile?.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${user.id}.${ext}`;
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
      avatar_url = path;
    }

    await supabase.from('profiles').update({ name, bio, avatar_url }).eq('id', user.id);
    await refreshProfile();
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    showToast('Profil mis à jour');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayProfile = avatarPreview
    ? { ...profile, avatar_url: null }
    : profile;

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">Profil</span>
        <button className="top-bar-action" onClick={() => setEditing(!editing)}>
          {editing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="profile-page">
        <div className="profile-header">
          {editing ? (
            <label htmlFor="profile-avatar" style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="preview" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <Avatar profile={profile} size={84} />
              )}
              <div className="avatar-upload-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <input id="profile-avatar" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
            </label>
          ) : (
            <Avatar profile={displayProfile} size={84} showOnline />
          )}

          {editing ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <input
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Prénom"
                maxLength={30}
              />
              <input
                className="input-field"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Bio"
                maxLength={60}
              />
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          ) : (
            <>
              <div className="profile-name-large">{profile?.name || '—'}</div>
              <div className="profile-sub">{profile?.bio || 'Disponible'}</div>
              <div className="profile-sub" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {user?.email}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <>
            <div className="divider" />
            <div className="section-header">Compte</div>

            <div className="menu-row" onClick={() => setEditing(true)}>
              <div className="menu-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="menu-row-text">Modifier le profil</div>
              <div className="menu-row-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div className="divider" />
            <div className="section-header">Application</div>

            <div className="menu-row" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Yo', text: 'Rejoins-moi sur Yo !', url: window.location.origin });
              } else {
                navigator.clipboard.writeText(window.location.origin);
                showToast('Lien copié !');
              }
            }}>
              <div className="menu-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div className="menu-row-text">Partager Yo</div>
              <div className="menu-row-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div className="menu-row" onClick={() => {
              const deferredPrompt = window._installPrompt;
              if (deferredPrompt) {
                deferredPrompt.prompt();
              } else {
                showToast("Utilisez 'Ajouter à l'écran d'accueil'");
              }
            }}>
              <div className="menu-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="menu-row-text">Installer l'application</div>
              <div className="menu-row-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div className="divider" style={{ marginTop: 8 }} />

            <div className="menu-row" onClick={handleLogout} style={{ marginTop: 4 }}>
              <div className="menu-row-icon" style={{ background: '#fef2f2' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div className="menu-row-text" style={{ color: '#ef4444' }}>Se déconnecter</div>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
