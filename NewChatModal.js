import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';

export default function NewChatModal({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, avatar_url, bio, is_online')
      .neq('id', user.id)
      .order('name')
      .then(({ data }) => setUsers(data || []));
  }, [user]);

  const filtered = users.filter(u =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const startChat = async (contactId) => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_a.eq.${user.id},participant_b.eq.${contactId}),and(participant_a.eq.${contactId},participant_b.eq.${user.id})`)
      .single();

    if (existing) {
      navigate(`/chat/${existing.id}`);
      onClose();
      return;
    }

    const { data: created } = await supabase
      .from('conversations')
      .insert({
        participant_a: user.id,
        participant_b: contactId,
        unread_a: 0,
        unread_b: 0,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (created) navigate(`/chat/${created.id}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Nouvelle conversation</div>
        <div style={{ padding: '0 16px 10px' }}>
          <div className="search-bar" style={{ margin: 0 }}>
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Rechercher un utilisateur"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-content">
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Aucun utilisateur trouvé
            </div>
          ) : (
            filtered.map(u => (
              <div key={u.id} className="contact-row" onClick={() => startChat(u.id)}>
                <Avatar profile={u} size={44} showOnline />
                <div className="contact-info">
                  <div className="contact-name">{u.name}</div>
                  <div className="contact-sub">{u.bio || 'Disponible'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
