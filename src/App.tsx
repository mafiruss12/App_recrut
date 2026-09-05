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
import { LogIn } from 'lucide-react';

function getPortalFromLocation(): 'commercial' | 'boss' {
  if (typeof window === 'undefined') return 'commercial';
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (
    path.startsWith('/boss') ||
    path.startsWith('/manager') ||
    path.startsWith('/admin') ||
    search.includes('portal=boss') ||
    search.includes('portal=manager') ||
    search.includes('mode=boss') ||
    search.includes('mode=manager') ||
    hash.includes('boss') ||
    hash.includes('manager')
  ) {
    return 'boss';
  }
  return 'commercial';
}

export default function App() {
  const [portal, setPortal] = useState<'commercial' | 'boss'>(getPortalFromLocation);
  const [isBossAuth, setIsBossAuth] = useState<boolean>(() => storage.isBossAuthenticated());

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

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [sheetsOk, setSheetsOk] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync URL changes
  useEffect(() => {
    const handlePopState = () => {
      setPortal(getPortalFromLocation());
      setIsBossAuth(storage.isBossAuthenticated());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Settings status
  useEffect(() => {
    const settings = storage.getSettings();
    setSheetsOk(!!settings.googleSheetsWebhookUrl);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, [refreshTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, []);

  const handleCommercialLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
    setLoginModalOpen(true);
  };

  const handleBossLogout = () => {
    storage.logoutBoss();
    setIsBossAuth(false);
  };

  const handleCommercialLoginSuccess = (user: Commercial, requiresProfile: boolean) => {
    setCurrentUser(user);
    if (requiresProfile) {
      setProfileModalOpen(true);
    }
  };

  const handleProfileSave = (updatedUser: Commercial) => {
    setCurrentUser(updatedUser);
    setProfileModalOpen(false);
  };

  const navigateToPortal = (target: 'commercial' | 'boss') => {
    const newPath = target === 'boss' ? '/boss' : '/';
    window.history.pushState({}, '', newPath);
    setPortal(target);
    setIsBossAuth(storage.isBossAuthenticated());
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Dynamic Frosted Background with Glowing Gradient & Orbs */}
      <FrostedBackground />

      {portal === 'boss' ? (
        /* ========================================================
           PORTAIL MANAGER / DIRECTION (BOSS) - URL: /boss
           ======================================================== */
        !isBossAuth ? (
          <BossLogin
            onSuccess={() => setIsBossAuth(true)}
            onGoToCommercial={() => navigateToPortal('commercial')}
          />
        ) : (
          <>
            <BossHeader
              onOpenGoogleSheets={() => setSheetsModalOpen(true)}
              onLogout={handleBossLogout}
              onRefresh={handleRefresh}
              isOnline={isOnline}
              sheetsOk={sheetsOk}
            />

            <main className="flex-1 flex flex-col z-10">
              <ManagerDashboard
                onRefresh={handleRefresh}
                onOpenGoogleSheets={() => setSheetsModalOpen(true)}
                onOpenNewEntry={() => window.open('/', '_blank')}
              />
            </main>

            {/* Google Sheets modal only for Boss */}
            <GoogleSheetsModal
              isOpen={sheetsModalOpen}
              onClose={() => setSheetsModalOpen(false)}
              onSuccess={handleRefresh}
            />
          </>
        )
      ) : (
        /* ========================================================
           PORTAIL COMMERCIAL (TERRAIN) - URL: /
           Strictly focused on field candidate entry & zero sensitive data
           ======================================================== */
        <>
          <CommercialHeader
            currentUser={currentUser}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenLogin={() => setLoginModalOpen(true)}
            onLogout={handleCommercialLogout}
            isOnline={isOnline}
            pendingQueueCount={pendingQueueCount}
          />

          <main className="flex-1 flex flex-col z-10">
            {currentUser ? (
              <CommercialView
                currentUser={currentUser}
                onRefresh={handleRefresh}
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
                    Connectez-vous avec votre numéro de téléphone et votre code personnel pour accéder à la saisie des fiches clients.
                  </p>
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Se Connecter</span>
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Commercial Modals */}
          <LoginModal
            isOpen={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onSuccess={handleCommercialLoginSuccess}
          />

          <ProfileSetupModal
            isOpen={profileModalOpen}
            user={currentUser}
            onSave={handleProfileSave}
          />
        </>
      )}
    </div>
  );
}
