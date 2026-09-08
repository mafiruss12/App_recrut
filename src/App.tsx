import { useState, useEffect, useCallback } from 'react';
import { FrostedBackground } from './components/FrostedBackground';
import { CommercialHeader } from './components/CommercialHeader';
import { BossHeader, type BossSection } from './components/BossHeader';
import { CommercialView } from './components/CommercialView';
import { ManagerDashboard } from './components/ManagerDashboard';
import { BossLogin } from './components/BossLogin';
import { LoginModal } from './components/LoginModal';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Commercial, canAccessBossPortal } from './types';
import { storage } from './lib/storage';
import { LogIn, ShieldAlert } from 'lucide-react';
import { PoweredBy } from './components/PoweredBy';
import { CommercialSettingsModal } from './components/CommercialSettingsModal';

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
    hash.includes('boss') ||
    hash.includes('manager')
  ) {
    return 'boss';
  }
  return 'commercial';
}

export default function App() {
  const [portal, setPortal] = useState<'commercial' | 'boss'>(getPortalFromLocation);
  const [currentUser, setCurrentUser] = useState<Commercial | null>(() => storage.getCurrentUser());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [sheetsOk, setSheetsOk] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSecurityBanner, setShowSecurityBanner] = useState(true);
  const [bossSection, setBossSection] = useState<BossSection>('dashboard');

  const isBossUser = currentUser && canAccessBossPortal(currentUser.role);

  useEffect(() => {
    const handlePopState = () => setPortal(getPortalFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      storage.syncOfflineQueue().then(() => setPendingQueueCount(storage.getOfflineQueue().length));
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const settings = storage.getSettings();
    setSheetsOk(!!settings.googleSheetsWebhookUrl);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, [refreshTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setPendingQueueCount(storage.getOfflineQueue().length);
  }, []);

  const handleLogout = async () => {
    await storage.logoutCommercial();
    setCurrentUser(null);
    if (portal === 'commercial') setLoginModalOpen(true);
  };

  const handleCommercialLoginSuccess = (user: Commercial, requiresProfile: boolean) => {
    setCurrentUser(user);
    if (canAccessBossPortal(user.role)) {
      window.history.pushState({}, '', '/boss');
      setPortal('boss');
    }
    if (requiresProfile) setProfileModalOpen(true);
  };

  const handleBossLoginSuccess = (user: Commercial) => {
    setCurrentUser(user);
    if (!user.profile_completed && user.role === 'superviseur') {
      setProfileModalOpen(true);
    }
  };

  const handleProfileSave = (updatedUser: Commercial) => {
    setCurrentUser(updatedUser);
    setProfileModalOpen(false);
  };

  const navigateToPortal = (target: 'commercial' | 'boss') => {
    window.history.pushState({}, '', target === 'boss' ? '/boss' : '/');
    setPortal(target);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-violet-600 selection:text-white">
      <FrostedBackground />

      {showSecurityBanner && (
        <div className="relative z-50 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Sécurité :</strong> Ne partagez jamais vos codes d’accès. Sessions limitées à 12 h.
            </span>
          </div>
          <button onClick={() => setShowSecurityBanner(false)} className="text-amber-400/80 hover:text-amber-300 font-medium px-2">
            Fermer
          </button>
        </div>
      )}

      {portal === 'boss' ? (
        !isBossUser ? (
          <BossLogin
            onSuccess={handleBossLoginSuccess}
            onGoToCommercial={() => navigateToPortal('commercial')}
          />
        ) : (
          <>
            <BossHeader
              currentUser={currentUser}
              activeSection={bossSection}
              onSectionChange={setBossSection}
              onOpenGoogleSheets={() => setSheetsModalOpen(true)}
              onOpenProfile={() => setProfileModalOpen(true)}
              onLogout={handleLogout}
              onRefresh={handleRefresh}
              isOnline={isOnline}
              sheetsOk={sheetsOk}
            />
            <main className="flex-1 flex flex-col z-10">
              <ManagerDashboard
                currentUser={currentUser!}
                activeSection={bossSection}
                onRefresh={handleRefresh}
                onOpenGoogleSheets={() => setSheetsModalOpen(true)}
                onOpenNewEntry={() => window.open('/', '_blank')}
              />
            </main>
            <GoogleSheetsModal
              isOpen={sheetsModalOpen}
              onClose={() => setSheetsModalOpen(false)}
              onSuccess={handleRefresh}
            />
            <ProfileSetupModal
              isOpen={profileModalOpen}
              user={currentUser}
              onSave={handleProfileSave}
            />
          </>
        )
      ) : (
        <>
          <CommercialHeader
            currentUser={currentUser}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenLogin={() => setLoginModalOpen(true)}
            onLogout={handleLogout}
            isOnline={isOnline}
            pendingQueueCount={pendingQueueCount}
            onOpenSettings={() => setSettingsModalOpen(true)}
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
                <div className="backdrop-blur-2xl bg-white/5 border border-white/10 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-2xl shadow-violet-900/20">
                  <div className="mb-6 flex justify-center">
                    <div className="bg-white rounded-2xl px-3 py-2 shadow-lg shadow-black/20 max-w-[280px] w-full">
                      <img src="/logo-k2l.png" alt="K2L Services" className="w-full h-auto object-contain" />
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                    Espace Commercial Terrain
                  </h2>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                    Connectez-vous avec votre numéro et votre code personnel pour saisir les fiches clients.
                  </p>
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </button>
                  <p className="mt-6 text-[11px] text-slate-500">
                    K2L Services SARL · Accès réservé au personnel autorisé
                  </p>
                  <div className="mt-3">
                    <PoweredBy />
                  </div>
                </div>
              </div>
            )}
          </main>
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
          <CommercialSettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            currentUser={currentUser}
            isOnline={isOnline}
            pendingCount={pendingQueueCount}
            onSync={async () => {
              await storage.syncOfflineQueue();
              handleRefresh();
            }}
          />
        </>
      )}
    </div>
  );
}
