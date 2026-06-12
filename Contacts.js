import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id, name, avatar_url, bio, is_online, last_seen')
      .neq('id', user.id)
      .order('name')
      .then(({ data }) => {
        setContacts(data || []);
        setLoading(false);
      });
  }, [user]);

  const openChat = async (contactId) => {
    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_a.eq.${user.id},participant_b.eq.${contactId}),and(participant_a.eq.${contactId},participant_b.eq.${user.id})`
      )
      .single();

    if (existing) {
      navigate(`/chat/${existing.id}`);
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
  };

  const filtered = contacts.filter(c =>
    !search || (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">Contacts</span>
      </div>

      <div className="content">
        <div className="search-bar">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher un contact"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="empty-title">Aucun contact</div>
            <div className="empty-sub">Les utilisateurs inscrits<br />apparaîtront ici</div>
          </div>
        ) : (
          <>
            <div className="section-header">{filtered.length} contact{filtered.length > 1 ? 's' : ''}</div>
            {filtered.map(c => (
              <div key={c.id} className="contact-row" onClick={() => openChat(c.id)}>
                <Avatar profile={c} size={46} showOnline />
                <div className="contact-info">
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-sub">{c.bio || 'Disponible'}</div>
                </div>
                {c.is_online && (
                  <div style={{ fontSize: 11, color: 'var(--online)', fontWeight: 500 }}>
                    En ligne
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
