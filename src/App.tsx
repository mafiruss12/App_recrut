import { useState, useEffect, useCallback } from 'react';
import { FrostedBackground } from './components/FrostedBackground';
import { Header } from './components/Header';
import { CommercialView } from './components/CommercialView';
import { ManagerDashboard } from './components/ManagerDashboard';
import { LoginModal } from './components/LoginModal';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { AuditStatusModal } from './components/AuditStatusModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Commercial } from './types';
import { storage } from './lib/storage';
import { checkSupabaseConnection } from './lib/supabase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Commercial | null>(() => {
    const saved = storage.getCurrentUser();
    if (saved) return saved;
    // Default to Mafi Russ for immediate frictionless testing
    const defaultComm = storage.getCommerciaux().find(c => c.phone === '0708091011');
    if (defaultComm) {
      storage.setCurrentUser(defaultComm);
      return defaultComm;
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<'commercial' | 'manager'>('commercial');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [supabaseOk, setSupabaseOk] = useState(true);
  const [sheetsOk, setSheetsOk] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      storage.syncOfflineQueue().then(() => {
        setPendingQueueCount(storage.getOfflineQueue().length);
      });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check Supabase and system health on mount
  useEffect(() => {
    checkSupabaseConnection().then(res => {
      setSupabaseOk(res.connected);
    });

    const settings = storage.getSettings();
    setSheetsOk(!!settings.googleSheetsWebhookUrl);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, [refreshTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, []);

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: Commercial, requiresProfile: boolean) => {
    setCurrentUser(user);
    if (user.role === 'manager') {
      setCurrentView('manager');
    } else {
      setCurrentView('commercial');
    }
    if (requiresProfile) {
      setProfileModalOpen(true);
    }
  };

  const handleProfileSave = (updatedUser: Commercial) => {
    setCurrentUser(updatedUser);
    setProfileModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Dynamic Frosted Background with Glowing Gradient & Orbs */}
      <FrostedBackground />

      {/* Header with Navigation & System Status */}
      <Header
        currentUser={currentUser}
        currentView={currentView}
        onSwitchView={view => {
          if (view === 'manager' && (!currentUser || currentUser.role !== 'manager')) {
            // Check if user is manager or allow direct switch for supervisor convenience
            setCurrentView('manager');
          } else {
            setCurrentView(view);
          }
        }}
        onOpenAudit={() => setAuditModalOpen(true)}
        onOpenGoogleSheets={() => setSheetsModalOpen(true)}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        isOnline={isOnline}
        supabaseOk={supabaseOk}
        sheetsOk={sheetsOk}
        pendingQueueCount={pendingQueueCount}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col z-10">
        {currentView === 'commercial' ? (
          currentUser ? (
            <CommercialView
              currentUser={currentUser}
              onRefresh={handleRefresh}
              onOpenProfile={() => setProfileModalOpen(true)}
              isOnline={isOnline}
              pendingCount={pendingQueueCount}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                  K2
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
                <p className="text-xs text-slate-400 mb-6">
                  Veuillez vous connecter avec votre numéro de téléphone et votre code personnel pour accéder à la saisie terrain.
                </p>
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          )
        ) : (
          <ManagerDashboard
            onRefresh={handleRefresh}
            onOpenGoogleSheets={() => setSheetsModalOpen(true)}
            onOpenNewEntry={() => setCurrentView('commercial')}
          />
        )}
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <ProfileSetupModal
        isOpen={profileModalOpen}
        user={currentUser}
        onSave={handleProfileSave}
      />

      <AuditStatusModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />

      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
