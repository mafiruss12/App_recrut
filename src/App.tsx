import { useState, useEffect, useCallback } from 'react';
import { FrostedBackground } from './components/FrostedBackground';
import { CommercialHeader } from './components/CommercialHeader';
import { BossHeader } from './components/BossHeader';
import { CommercialView } from './components/CommercialView';
import { ManagerDashboard } from './components/ManagerDashboard';
import { BossLogin } from './components/BossLogin';
import { LoginModal } from './components/LoginModal';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Commercial } from './types';
import { storage } from './lib/storage';
import { isSupabaseConfigured } from './lib/supabase';
import { LogIn, AlertCircle, LoaderCircle } from 'lucide-react';

function getPortalFromLocation(): 'commercial' | 'boss' {
  if (typeof window === 'undefined') return 'commercial';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  return ['/boss', '/manager', '/admin'].includes(path) ? 'boss' : 'commercial';
}

export default function App() {
  const [portal, setPortal] = useState<'commercial' | 'boss'>(getPortalFromLocation);
  const [isBossAuth, setIsBossAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<Commercial | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [sheetsOk, setSheetsOk] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshLocalState = useCallback(() => {
    const settings = storage.getSettings();
    setSheetsOk(Boolean(settings.googleSheetsWebhookUrl && settings.autoSyncGoogleSheets));
    setPendingQueueCount(storage.getOfflineQueue().length);
    setRefreshTrigger(value => value + 1);
  }, []);

  useEffect(() => {
    let disposed = false;

    const boot = async () => {
      try {
        await storage.initialize();
        if (isSupabaseConfigured) {
          const profile = await storage.restoreSession();
          if (!disposed && profile) {
            setCurrentUser(profile);
            setIsBossAuth(profile.role === 'manager');
          }
        }
        if (!disposed) refreshLocalState();
      } catch (error) {
        if (!disposed) {
          setBootError(error instanceof Error ? error.message : 'Initialisation impossible.');
        }
      } finally {
        if (!disposed) setIsBooting(false);
      }
    };

    void boot();
    return () => {
      disposed = true;
    };
  }, [refreshLocalState]);

  useEffect(() => {
    const handlePopState = () => {
      const nextPortal = getPortalFromLocation();
      setPortal(nextPortal);
      setIsBossAuth(storage.isBossAuthenticated());
    };

    const handleOnline = async () => {
      setIsOnline(true);
      await storage.syncOfflineQueue();
      if (storage.getCurrentUser()) await storage.refreshRemoteData();
      refreshLocalState();
    };

    const handleOffline = () => setIsOnline(false);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshLocalState]);

  const handleRefresh = useCallback(async () => {
    await storage.syncOfflineQueue();
    if (storage.getCurrentUser()) await storage.refreshRemoteData();
    refreshLocalState();
  }, [refreshLocalState]);

  const handleCommercialLogout = async () => {
    await storage.logout();
    setCurrentUser(null);
    setIsBossAuth(false);
    setLoginModalOpen(true);
    refreshLocalState();
  };

  const handleBossLogout = async () => {
    await storage.logout();
    setCurrentUser(null);
    setIsBossAuth(false);
  };

  const handleCommercialLoginSuccess = (user: Commercial, requiresProfile: boolean) => {
    setCurrentUser(user);
    setIsBossAuth(user.role === 'manager');
    if (requiresProfile) setProfileModalOpen(true);
    void handleRefresh();
  };

  const handleProfileSave = (updatedUser: Commercial) => {
    setCurrentUser(updatedUser);
    setProfileModalOpen(false);
    refreshLocalState();
  };

  const navigateToPortal = (target: 'commercial' | 'boss') => {
    const newPath = target === 'boss' ? '/boss' : '/';
    window.history.pushState({}, '', newPath);
    setPortal(target);
    setIsBossAuth(target === 'boss' && storage.isBossAuthenticated());
  };

  const appContent = portal === 'boss' ? (
    !isBossAuth ? (
      <BossLogin
        onSuccess={user => {
          setCurrentUser(user);
          setIsBossAuth(true);
          void handleRefresh();
        }}
        onGoToCommercial={() => navigateToPortal('commercial')}
      />
    ) : (
      <>
        <BossHeader
          onOpenGoogleSheets={() => setSheetsModalOpen(true)}
          onLogout={() => void handleBossLogout()}
          onRefresh={() => void handleRefresh()}
          isOnline={isOnline}
          sheetsOk={sheetsOk}
        />
        <main className="flex-1 flex flex-col z-10">
          <ManagerDashboard
            onRefresh={() => void handleRefresh()}
            onOpenGoogleSheets={() => setSheetsModalOpen(true)}
            onOpenNewEntry={() => window.open('/', '_blank', 'noopener,noreferrer')}
          />
        </main>
        <GoogleSheetsModal
          isOpen={sheetsModalOpen}
          onClose={() => setSheetsModalOpen(false)}
          onSuccess={() => void handleRefresh()}
        />
      </>
    )
  ) : (
    <>
      <CommercialHeader
        currentUser={currentUser}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => void handleCommercialLogout()}
        isOnline={isOnline}
        pendingQueueCount={pendingQueueCount}
      />
      <main className="flex-1 flex flex-col z-10">
        {currentUser ? (
          <CommercialView
            currentUser={currentUser}
            onRefresh={() => void handleRefresh()}
            onOpenProfile={() => setProfileModalOpen(true)}
            isOnline={isOnline}
            pendingCount={pendingQueueCount}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                K2
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connexion Commercial Terrain</h2>
              <p className="text-xs text-slate-400 mb-6">
                Connectez-vous avec votre téléphone et votre mot de passe Supabase pour accéder à la saisie terrain.
              </p>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Se connecter</span>
              </button>
            </div>
          </div>
        )}
      </main>
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleCommercialLoginSuccess}
      />
      <ProfileSetupModal isOpen={profileModalOpen} user={currentUser} onSave={handleProfileSave} />
    </>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      <FrostedBackground />
      {isBooting ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-slate-300 z-10">
          <LoaderCircle className="w-5 h-5 animate-spin text-indigo-400" />
          Chargement sécurisé…
        </div>
      ) : (
        <>
          {!isSupabaseConfigured && (
            <div className="relative z-30 mx-auto mt-3 max-w-2xl px-4 w-full">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Configuration manquante : renseignez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY avant utilisation.</span>
              </div>
            </div>
          )}
          {bootError && (
            <div className="relative z-30 mx-auto mt-3 max-w-2xl px-4 w-full">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{bootError}</div>
            </div>
          )}
          {appContent}
        </>
      )}
    </div>
  );
}
