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
import { LandingPage } from './components/LandingPage';
import { SuperAdminLogin } from './components/SuperAdminLogin';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { Commercial } from './types';
import { storage } from './lib/storage';
import { isSupabaseConfigured } from './lib/supabase';
import { LogIn, AlertCircle, LoaderCircle } from 'lucide-react';

type Portal = 'landing' | 'commercial' | 'boss' | 'super-admin';

function getPortalFromLocation(): Portal {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path === '/super-admin') return 'super-admin';
  if (['/boss', '/manager', '/admin'].includes(path)) return 'boss';
  if (path === '/commercial') return 'commercial';
  return 'landing';
}

export default function App() {
  const [portal, setPortal] = useState<Portal>(getPortalFromLocation);
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
            setIsBossAuth(profile.role === 'admin' || profile.role === 'manager');
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
    setIsBossAuth(user.role === 'admin' || user.role === 'manager');
    if (requiresProfile) setProfileModalOpen(true);
    void handleRefresh();
  };

  const handleProfileSave = (updatedUser: Commercial) => {
    setCurrentUser(updatedUser);
    setProfileModalOpen(false);
    refreshLocalState();
  };

  const navigateToPortal = (target: Portal) => {
    const path = target === 'boss' ? '/admin' : target === 'super-admin' ? '/super-admin' : target === 'commercial' ? '/commercial' : '/';
    window.history.pushState({}, '', path);
    setPortal(target);
    setIsBossAuth(target === 'boss' && storage.isBossAuthenticated());
  };

  const appContent = portal === 'landing' ? (
    <LandingPage
      onOpenCommercial={() => navigateToPortal('commercial')}
      onOpenAdmin={() => navigateToPortal('boss')}
      onOpenSuperAdmin={() => navigateToPortal('super-admin')}
    />
  ) : portal === 'super-admin' ? (
    currentUser?.role !== 'super_admin' ? (
      <SuperAdminLogin
        onSuccess={user => { setCurrentUser(user); void handleRefresh(); }}
        onBack={() => navigateToPortal('landing')}
      />
    ) : (
      <SuperAdminDashboard user={currentUser} onLogout={() => void handleBossLogout()} />
    )
  ) : portal === 'boss' ? (
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
            onOpenNewEntry={() => window.open('/commercial', '_blank', 'noopener,noreferrer')}
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
        {currentUser?.role === 'commercial' ? (
          <CommercialView
            currentUser={currentUser}
            onRefresh={() => void handleRefresh()}
            onOpenProfile={() => setProfileModalOpen(true)}
            isOnline={isOnline}
            pendingCount={pendingQueueCount}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center bg-slate-50">
            <div className="p-8 rounded-3xl max-w-md w-full bg-white border border-slate-200 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 font-black text-2xl">K2</div>
              <h2 className="text-xl font-black text-slate-950 mb-2">Espace Commercial</h2>
              <p className="text-sm text-slate-500 mb-6">Connectez-vous avec votre téléphone et votre code personnel pour accéder à vos saisies terrain.</p>
              <button onClick={() => setLoginModalOpen(true)} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"><LogIn className="w-4 h-4" />Se connecter</button>
            </div>
          </div>
        )}
      </main>
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSuccess={handleCommercialLoginSuccess} />
      <ProfileSetupModal isOpen={profileModalOpen} user={currentUser} onSave={handleProfileSave} />
    </>
  );

  return (
    <div className={`min-h-screen text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white ${portal === 'super-admin' ? 'bg-slate-950' : portal === 'commercial' || portal === 'boss' ? 'k2l-modern' : ''}`}>
      <FrostedBackground dark={portal === 'super-admin'} />
      {isBooting ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-slate-300 z-10">
          <LoaderCircle className="w-5 h-5 animate-spin text-indigo-400" />
          Chargement sécurisé…
        </div>
      ) : (
        <>
          {!isSupabaseConfigured && portal !== 'landing' && (
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
