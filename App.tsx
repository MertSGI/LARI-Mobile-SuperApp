import React, { Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// Target Turkey market domain: randevulari.com / brand: LARİ / lari

import MobileSuperAppPage from './pages/mobile/MobileSuperAppPage';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import SafeErrorBoundary from './components/SafeErrorBoundary';

// Web, admin and super-admin surfaces stay outside the native mobile entry chunk.
const MarketingLayout = React.lazy(() => import('./components/layouts/MarketingLayout'));
const SalonBookingLayout = React.lazy(() => import('./components/layouts/SalonBookingLayout'));
const AdminLayout = React.lazy(() => import('./components/layouts/AdminLayout'));
const SuperAdminLayout = React.lazy(() => import('./components/layouts/SuperAdminLayout'));
const MarketingHomePage = React.lazy(() => import('./pages/MarketingHomePage'));
const FeaturesPage = React.lazy(() => import('./pages/FeaturesPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const RegistrationPage = React.lazy(() => import('./pages/RegistrationPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const PilotDemoEntryPage = React.lazy(() => import('./pages/PilotDemoEntryPage'));
const PilotAdminPreviewPage = React.lazy(() =>
  import('./pages/PilotAdminPreviewPage').then((module) => ({
    default: module.PilotAdminPreviewPage,
  }))
);
const AIVisualizerPage = React.lazy(() => import('./pages/AIVisualizerPage'));
const DemoLandingPage = React.lazy(() => import('./pages/DemoLandingPage'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminTenantsPage = React.lazy(() => import('./pages/super-admin/SuperAdminTenantsPage'));
const SuperAdminSubscriptionsPage = React.lazy(() => import('./pages/super-admin/SuperAdminSubscriptionsPage'));
const SuperAdminPaymentsPage = React.lazy(() => import('./pages/super-admin/SuperAdminPaymentsPage'));
const SuperAdminOnboardingPage = React.lazy(() => import('./pages/super-admin/SuperAdminOnboardingPage'));
const SuperAdminReportsPage = React.lazy(() => import('./pages/super-admin/SuperAdminReportsPage'));
const SuperAdminSettingsPage = React.lazy(() => import('./pages/super-admin/SuperAdminSettingsPage'));
const SuperAdminPaymentTestPage = React.lazy(() => import('./pages/super-admin/SuperAdminPaymentTestPage'));
const SuperAdminAISettingsPage = React.lazy(() => import('./pages/super-admin/SuperAdminAISettingsPage'));
const SuperAdminPlansPage = React.lazy(() => import('./pages/super-admin/SuperAdminPlansPage'));
const SuperAdminReferralsPage = React.lazy(() => import('./pages/super-admin/SuperAdminReferralsPage'));
const SuperAdminTenantPreviewPage = React.lazy(() => import('./pages/super-admin/SuperAdminTenantPreviewPage'));
const SuperAdminGoLivePage = React.lazy(() => import('./pages/super-admin/SuperAdminGoLivePage'));
const SuperAdminPilotTrackerPage = React.lazy(() => import('./pages/super-admin/SuperAdminPilotTrackerPage'));
const SuperAdminManualProvisioningPage = React.lazy(() => import('./pages/super-admin/SuperAdminManualProvisioningPage'));
const SuperAdminSchedulerPage = React.lazy(() => import('./pages/super-admin/SuperAdminSchedulerPage'));
const SuperAdminObservabilityPage = React.lazy(() => import('./pages/super-admin/SuperAdminObservabilityPage'));
const SuperAdminLegalPage = React.lazy(() => import('./pages/super-admin/SuperAdminLegalPage'));
const SuperAdminCommercialManagementPage = React.lazy(() => import('./pages/super-admin/SuperAdminCommercialManagementPage'));
const SitePreviewPage = React.lazy(() => import('./pages/admin/SitePreviewPage'));
const CustomerLoginPage = React.lazy(() => import('./pages/customer/CustomerLoginPage'));
const CustomerPortalPage = React.lazy(() => import('./pages/customer/CustomerPortalPage'));
const AppointmentSelfServicePage = React.lazy(() => import('./pages/AppointmentSelfServicePage'));
const MobileAppPage = React.lazy(() => import('./pages/MobileAppPage'));
const MockDiagnosticTool = React.lazy(() =>
  import('./components/MockDiagnosticTool').then((module) => ({
    default: module.MockDiagnosticTool,
  }))
);

// Use hash routing for embedded previews and browser routing for production
const Router = (import.meta as any).env.VITE_ROUTER_MODE === 'browser' 
  ? BrowserRouter 
  : HashRouter;

const isNativeMobileRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const isCap = Boolean((window as any).Capacitor?.isNativePlatform?.());
  return (
    isCap ||
    host === 'app.randevulari.com' ||
    host === 'app.lari.app' ||
    search.includes('app=1') ||
    hash.includes('app=1')
  );
};

const AppFlowSwitcher: React.FC = () => {
  const { tenant } = useTenant();
  const nativeMobile = isNativeMobileRuntime();

  // If running inside Native Mobile App (Capacitor / app.randevulari.com / ?app=1),
  // never mount MarketingLayout or web SalonBookingLayout on root paths.
  if (nativeMobile) {
    return (
      <Routes>
        <Route path="/" element={<MobileSuperAppPage />} />
        <Route path="/m" element={<MobileSuperAppPage />} />
        <Route path="/m/*" element={<MobileSuperAppPage />} />
        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    );
  }

  // If there's a tenant loaded, we're in "tenant mode" (except for admin routes which manage themselves)
  return (
    <Routes>
      {/* 1. Marketing Routes (Redirected to Native Super-App when inside Mobile APK / app.randevulari.com) */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={
          nativeMobile
            ? <Navigate to="/m" replace />
            : tenant && !['localhost', '127.0.0.1'].includes(window.location.hostname) && !window.location.hostname.includes('run.app')
              ? <Navigate to="/book" replace /> 
              : <MarketingHomePage />
        } />
        <Route path="/features" element={nativeMobile ? <Navigate to="/m" replace /> : <FeaturesPage />} />
        <Route path="/mobile-app" element={nativeMobile ? <Navigate to="/m" replace /> : <MobileAppPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/demo" element={<DemoLandingPage />} />
        <Route path="/pilot" element={<PilotDemoEntryPage />} />
        <Route path="/pilot/admin" element={<PilotAdminPreviewPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      {/* 2. Self-Service Routes (Must precede dynamic /:tenantSlug) */}
      <Route path="/appointment/manage/:token" element={<AppointmentSelfServicePage />} />
      <Route path="/appointment/manage" element={<AppointmentSelfServicePage />} />

      {/* 2.1 Salon Booking Routes */}
      <Route element={<SalonBookingLayout />}>
        <Route path="/book" element={nativeMobile ? <Navigate to="/m" replace /> : <BookingPage />} />
        {/* Dedicated Pilot Customer route */}
        <Route path="/pilot/customer" element={<BookingPage />} />
        {/* AI Tool - Now part of the salon booking flow */}
        <Route path="/ai-visualizer" element={<AIVisualizerPage />} />
        {/* Dynamic Tenant Routing */}
        <Route path="/booking/:tenantSlug" element={<BookingPage />} />
        <Route path="/:tenantSlug" element={<BookingPage />} />
      </Route>

      {/* 2.5 Customer Routes */}
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/appointments" element={<CustomerPortalPage />} />
      <Route path="/customer" element={<Navigate to="/customer/appointments" replace />} />

      {/* 3. Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['tenant_owner', 'super_admin']}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Route>
      {/* Admin preview route doesn't need standard admin layout so we place it outside it or with a minimal layout*/}
      <Route path="/admin-preview" element={<Navigate to="/admin/site-preview" replace />} />
      <Route path="/admin/site-preview" element={
        <ProtectedRoute allowedRoles={['tenant_owner']}>
          <SitePreviewPage />
        </ProtectedRoute>
      } />

      {/* 4. Super Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminLayout /></ProtectedRoute>}>
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/tenants" element={<SuperAdminTenantsPage />} />
        <Route path="/super-admin/subscriptions" element={<SuperAdminSubscriptionsPage />} />
        <Route path="/super-admin/payments" element={<SuperAdminPaymentsPage />} />
        <Route path="/super-admin/onboarding" element={<SuperAdminOnboardingPage />} />
        <Route path="/super-admin/reports" element={<SuperAdminReportsPage />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettingsPage />} />
        <Route path="/super-admin/payment-test" element={<SuperAdminPaymentTestPage />} />
        <Route path="/super-admin/ai-settings" element={<SuperAdminAISettingsPage />} />
        <Route path="/super-admin/plans" element={<SuperAdminPlansPage />} />
        <Route path="/super-admin/referrals" element={<SuperAdminReferralsPage />} />
        <Route path="/super-admin/go-live" element={<SuperAdminGoLivePage />} />
        <Route path="/super-admin/pilots" element={<SuperAdminPilotTrackerPage />} />
        <Route path="/super-admin/provisioning" element={<SuperAdminManualProvisioningPage />} />
        <Route path="/super-admin/scheduler" element={<SuperAdminSchedulerPage />} />
        <Route path="/super-admin/commercial" element={<SafeErrorBoundary><SuperAdminCommercialManagementPage /></SafeErrorBoundary>} />
        <Route path="/super-admin/observability" element={<SafeErrorBoundary><SuperAdminObservabilityPage /></SafeErrorBoundary>} />
        <Route path="/super-admin/legal" element={<SafeErrorBoundary><SuperAdminLegalPage /></SafeErrorBoundary>} />
      </Route>
      <Route path="/super-admin/tenant-preview/:tenantId" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminTenantPreviewPage />
        </ProtectedRoute>
      } />
      
      {/* 4.5 Mobile Super-App Routes (B2C + B2B Dual Mode) */}
      <Route path="/m" element={<MobileSuperAppPage />} />
      <Route path="/m/*" element={<MobileSuperAppPage />} />

      {/* Catch-all route to prevent white screens on unknown paths */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 border-t-4 border-red-500">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Sayfa bulunamadı. Lütfen adresi kontrol edin.</p>
            <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">Ana Sayfaya Dön</a>
          </div>
        </div>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  const showWebDiagnostic =
    typeof window !== 'undefined' &&
    !isNativeMobileRuntime() &&
    !window.location.pathname.startsWith('/m') &&
    !window.location.hash.startsWith('#/m');

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <DialogProvider>
          <LanguageProvider>
            <TenantProvider>
              <AuthProvider>
                <Router>
                  <Suspense
                    fallback={
                      <div
                        className="min-h-screen bg-[#F5F7FA]"
                        role="status"
                        aria-label="Sayfa yükleniyor"
                      />
                    }
                  >
                    <AppFlowSwitcher />
                    {showWebDiagnostic && <MockDiagnosticTool />}
                  </Suspense>
                </Router>
              </AuthProvider>
            </TenantProvider>
          </LanguageProvider>
        </DialogProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
};

export default App;
