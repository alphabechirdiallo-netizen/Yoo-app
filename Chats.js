import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';
import { formatTime } from '../lib/utils';

export default function Chats({ onNewChat }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        updated_at,
        participant_a,
        participant_b,
        last_message,
        last_message_at,
        unread_a,
        unread_b,
        profile_a:profiles!conversations_participant_a_fkey(id, name, avatar_url, is_online),
        profile_b:profiles!conversations_participant_b_fkey(id, name, avatar_url, is_online)
      `)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!error) setConversations(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, fetchConversations)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchConversations]);

  const getOtherProfile = (conv) => {
    return conv.participant_a === user.id ? conv.profile_b : conv.profile_a;
  };

  const getUnread = (conv) => {
    return conv.participant_a === user.id ? conv.unread_a : conv.unread_b;
  };

  const filtered = conversations.filter(c => {
    const p = getOtherProfile(c);
    return !search || (p?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">Messages</span>
        <button className="top-bar-action" onClick={onNewChat} title="Nouvelle conversation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="8" x2="12" y2="14"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
        </button>
      </div>

      <div className="content">
        <div className="search-bar">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="empty-title">Aucune conversation</div>
            <div className="empty-sub">Appuyez sur + pour démarrer<br />une nouvelle discussion</div>
          </div>
        ) : (
          filtered.map(conv => {
            const other = getOtherProfile(conv);
            const unread = getUnread(conv);
            return (
              <div key={conv.id} className="contact-row" onClick={() => navigate(`/chat/${conv.id}`)}>
                <Avatar profile={other} size={48} showOnline />
                <div className="contact-info">
                  <div className="contact-name">{other?.name || 'Inconnu'}</div>
                  <div className="contact-sub">{conv.last_message || 'Nouvelle conversation'}</div>
                </div>
                <div className="contact-meta">
                  <div className="contact-time">{formatTime(conv.last_message_at)}</div>
                  {unread > 0 && <div className="unread-badge">{unread}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
