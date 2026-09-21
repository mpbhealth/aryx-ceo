import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import { AppShell } from './components/shell/AppShell';
import { buildRouteToTabMap, getNavigationForRole } from './config/navigation';
import { Breadcrumbs } from './components/ui/Breadcrumbs';
import { KeyboardShortcutsModal } from './components/ui/KeyboardShortcutsModal';
import { SessionTimeoutWarning } from './components/security/SessionTimeoutWarning';
import { UpdateBanner } from './components/ui/UpdateBanner';
import { InstallAppBanner } from './components/ui/InstallAppBanner';
import { remapLegacyPath } from './lib/cos';
import { ThemeToggle } from './components/brand/ThemeToggle';
import { OrgProvider, useOrg } from './contexts/OrgContext';
import { DeskPeriodProvider } from './contexts/DeskPeriodContext';
import { AIAssistantProvider } from './providers/AIAssistantProvider';
import { GlobalAIAssistant } from './components/ai/GlobalAIAssistant';

const CosHome = lazy(() => import('./components/pages/CosHome'));
const CosInbox = lazy(() => import('./components/pages/CosInbox'));
const CosCrmList = lazy(() => import('./components/pages/CosCrmList'));
const CosCrmDetail = lazy(() => import('./components/pages/CosCrmDetail'));
const CosFinance = lazy(() => import('./components/pages/CosFinance'));
const CosVendors = lazy(() => import('./components/pages/CosVendors'));
const CosForecast = lazy(() => import('./components/pages/CosForecast'));
const CosEnrollments = lazy(() => import('./components/pages/CosEnrollments'));
const CosAdvisors = lazy(() => import('./components/pages/CosAdvisors'));
const CosPipeline = lazy(() => import('./components/pages/CosPipeline'));
const CosTickets = lazy(() => import('./components/pages/CosTickets'));
const CosTicketAnalytics = lazy(() => import('./components/pages/CosTicketAnalytics'));
const CosWebsite = lazy(() => import('./components/pages/CosWebsite'));
const CosIntegrations = lazy(() => import('./components/pages/CosIntegrations'));
const DailyOrganizer = lazy(() => import('./components/pages/DailyOrganizer'));
const Settings = lazy(() => import('./components/pages/Settings'));
const OAuthCallback = lazy(() => import('./components/pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));

const DevelopmentOverview = lazy(() => import('./components/pages/CosDevelopment'));
const TechStack = lazy(() => import('./components/pages/TechStack'));
const QuickLinks = lazy(() => import('./components/pages/QuickLinks'));
const Roadmap = lazy(() => import('./components/pages/Roadmap'));
const RoadVisualizer = lazy(() => import('./components/pages/RoadVisualizerWithFilters'));
const Projects = lazy(() => import('./components/pages/Projects'));
const Assignments = lazy(() => import('./components/pages/Assignments'));
const Notepad = lazy(() => import('./components/pages/Notepad'));

const Operations = lazy(() => import('./components/pages/CosOperations'));
const EmployeePerformance = lazy(() => import('./components/pages/CosStaff'));
const SaaSSpend = lazy(() => import('./components/pages/SaaSSpend'));
const PolicyManagement = lazy(() => import('./components/pages/PolicyManagement'));
const OrganizationalStructure = lazy(() => import('./components/pages/OrganizationalStructure'));
const Deployments = lazy(() => import('./components/pages/Deployments'));
const Files = lazy(() => import('./components/pages/CosFiles'));

const LoadingFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-aryx-bg" role="status">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-aryx-line border-t-aryx-accent" />
  </div>
);

function LegacyRedirect() {
  const location = useLocation();
  const next = remapLegacyPath(location.pathname);
  if (next && next !== location.pathname) {
    return <Navigate to={next} replace />;
  }
  return <Navigate to="/home" replace />;
}

function CosContent() {
  const location = useLocation();
  const { profile, profileReady, loading } = useAuth();
  const { linked } = useOrg();
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const navigationItems = useMemo(
    () => getNavigationForRole(profile?.role, { tickets: linked.tickets, traffic: linked.traffic }),
    [linked.tickets, linked.traffic, profile?.role],
  );
  const routeToTabMap = useMemo(() => buildRouteToTabMap(navigationItems), [navigationItems]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarExpanded(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const matched = routeToTabMap[location.pathname];
    if (matched) setActiveTab(matched);
  }, [location.pathname, routeToTabMap]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  if (loading || !profileReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-aryx-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-aryx-line border-t-aryx-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-aryx-bg text-aryx-ink">
      <div className="cos-grain" aria-hidden="true" />
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isSidebarExpanded={isSidebarExpanded}
        onSidebarToggle={() => setIsSidebarExpanded((v) => !v)}
      />

      <main
        id="main-content"
        className={`min-h-[100dvh] flex-1 overflow-y-auto ${
          isSidebarExpanded ? 'md:pl-80' : 'md:pl-20'
        }`}
      >
        {isMobile ? (
          <div className="sticky top-0 z-[60] px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between rounded-full bg-aryx-elevated/90 px-2 py-1.5 ring-1 ring-aryx-line backdrop-blur-xl">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full text-aryx-ink"
                onClick={() => setIsSidebarExpanded((open) => !open)}
                aria-label={isSidebarExpanded ? 'Close navigation' : 'Open navigation'}
              >
                <span className="relative block h-3.5 w-4">
                  <span
                    className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isSidebarExpanded ? 'translate-y-[7px] rotate-45' : ''
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[7px] h-px w-full bg-current transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isSidebarExpanded ? 'opacity-0' : ''
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[14px] h-px w-full bg-current transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isSidebarExpanded ? '-translate-y-[7px] -rotate-45' : ''
                    }`}
                  />
                </span>
              </button>
              <span className="font-display text-[11px] font-semibold tracking-[0.28em]">ARYX</span>
              <ThemeToggle />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end px-4 pt-4">
            <ThemeToggle />
          </div>
        )}
        <Breadcrumbs />
        <div className="cos-page w-full min-w-0 px-4 pb-16 sm:px-6 md:px-8">
          <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<CosHome />} />
            <Route path="/command" element={<CosHome />} />
            <Route path="/inbox" element={<CosInbox />} />
            <Route path="/organizer" element={<DailyOrganizer dashboardRole="cos" />} />
            <Route path="/crm" element={<CosCrmList />} />
            <Route path="/crm/:kind/:id" element={<CosCrmDetail />} />
            <Route path="/finance" element={<CosFinance />} />
            <Route path="/finance/vendors" element={<CosVendors />} />
            <Route path="/finance/forecast" element={<CosForecast />} />
            <Route path="/enrollments" element={<CosEnrollments />} />
            <Route path="/advisors" element={<CosAdvisors />} />
            <Route path="/pipeline" element={<CosPipeline />} />
            <Route path="/tickets" element={<CosTickets />} />
            <Route path="/tickets/analytics" element={<CosTicketAnalytics />} />
            <Route path="/marketing" element={<CosWebsite />} />
            <Route path="/analytics/website" element={<Navigate to="/marketing" replace />} />
            <Route path="/analytics/marketing" element={<Navigate to="/marketing" replace />} />
            <Route path="/analytics" element={<LegacyRedirect />} />
            <Route path="/analytics/overview" element={<LegacyRedirect />} />
            <Route path="/analytics/member-engagement" element={<LegacyRedirect />} />
            <Route path="/analytics/member-retention" element={<LegacyRedirect />} />
            <Route path="/analytics/advisor-performance" element={<LegacyRedirect />} />
            <Route path="/development" element={<DevelopmentOverview />} />
            <Route path="/development/tech-stack" element={<TechStack />} />
            <Route path="/development/quicklinks" element={<QuickLinks />} />
            <Route path="/development/roadmap" element={<Roadmap />} />
            <Route path="/development/roadmap-visualizer" element={<RoadVisualizer />} />
            <Route path="/development/projects" element={<Projects />} />
            <Route path="/development/assignments" element={<Assignments />} />
            <Route path="/development/notepad" element={<Notepad />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/operations/compliance" element={<Navigate to="/operations" replace />} />
            <Route path="/operations/compliance/*" element={<Navigate to="/operations" replace />} />
            <Route path="/operations/saas-spend" element={<SaaSSpend />} />
            <Route path="/operations/it-support" element={<Navigate to="/tickets" replace />} />
            <Route path="/operations/integrations" element={<CosIntegrations />} />
            <Route path="/operations/policy-manager" element={<PolicyManagement />} />
            <Route path="/operations/organization" element={<OrganizationalStructure />} />
            <Route path="/operations/performance-evaluation" element={<EmployeePerformance />} />
            <Route path="/operations/infrastructure/deployments" element={<Deployments />} />
            <Route path="/files" element={<Files />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/ceod/*" element={<LegacyRedirect />} />
            <Route path="/ctod/*" element={<LegacyRedirect />} />
            <Route path="/admin/*" element={<Navigate to="/home" replace />} />
            <Route path="/advisor/*" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<LegacyRedirect />} />
          </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function CosApp() {
  return (
    <AIAssistantProvider>
      <AppShell>
        <OrgProvider>
          <DeskPeriodProvider>
            <CosContent />
            <GlobalAIAssistant />
          </DeskPeriodProvider>
        </OrgProvider>
        <KeyboardShortcutsModal />
        <SessionTimeoutWarning />
        <UpdateBanner />
        <InstallAppBanner />
      </AppShell>
    </AIAssistantProvider>
  );
}
