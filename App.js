import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { usePresence } from './lib/usePresence';
import Splash from './pages/Splash';
import Auth from './pages/Auth';
import ProfileSetup from './pages/ProfileSetup';
import Chats from './pages/Chats';
import Contacts from './pages/Contacts';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import BottomNav from './components/BottomNav';
import NewChatModal from './components/NewChatModal';

// Capture install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window._installPrompt = e;
});

function AppShell() {
  const { user, profile, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  usePresence(user?.id);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  // Navigate based on tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/${tab === 'chats' ? '' : tab}`);
  };

  // Detect if we're in a chat (hide bottom nav)
  const inChat = location.pathname.startsWith('/chat/');

  if (showSplash || loading) {
    return <div className="app-shell"><Splash /></div>;
  }

  if (!user) {
    return <div className="app-shell"><Auth /></div>;
  }

  if (!profile || !profile.name) {
    return <div className="app-shell"><ProfileSetup /></div>;
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={
          <Chats onNewChat={() => setShowNewChat(true)} />
        } />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat/:convId" element={<Chat />} />
      </Routes>

      {!inChat && (
        <BottomNav
          active={activeTab}
          onChange={handleTabChange}
        />
      )}

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
