import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  MobileAppSessionProvider,
  useMobileAppSession,
} from '../../contexts/MobileAppSessionContext';
import {
  MobilePersonaType,
  MobileShellMode,
  MobileTabDescriptor,
  resolveMobileShellState,
} from '../../services/mobile/mobileShellPolicyService';
import { MobileDiscoveryListingItem } from '../../services/mobile/mobileDiscoveryService';
import MobileAppShell from '../../components/layouts/MobileAppShell';
import MobileStoryOnboarding from '../../components/mobile/MobileStoryOnboarding';
import MobileExploreMarketplacePage, {
  DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
} from './b2c/MobileExploreMarketplacePage';
import MobileBookingBottomSheet from '../../components/mobile/b2c/MobileBookingBottomSheet';
import MobileQuickBookCarouselSheet from '../../components/mobile/b2c/MobileQuickBookCarouselSheet';
import { StorefrontSpecialistProfile } from '../../components/mobile/b2c/MobileStorefrontDetailDrawer';
import MobilePartnerOnboardingFunnel from '../../components/mobile/partner/MobilePartnerOnboardingFunnel';
import MobileAuthModal from '../../components/mobile/MobileAuthModal';
import MobileCustomerWalletPage from './b2c/MobileCustomerWalletPage';
import MobileSocialFeedPage from './b2c/MobileSocialFeedPage';
import MobileAIStyleVisualizerPage from './b2c/MobileAIStyleVisualizerPage';
import MobileHealthTourismConciergePage from './b2c/MobileHealthTourismConciergePage';
import MobileProfileSettingsPage from './MobileProfileSettingsPage';
import MobilePartnerAgendaAndInboxPage from './partner/MobilePartnerAgendaAndInboxPage';
import MobilePartnerPosAndInventoryPage from './partner/MobilePartnerPosAndInventoryPage';
import MobilePartnerClinicWorkspacePage from './partner/MobilePartnerClinicWorkspacePage';
import MobilePartnerHtLeadOpsPage from './partner/MobilePartnerHtLeadOpsPage';
import MobilePartnerCustomer360Page from './partner/MobilePartnerCustomer360Page';
import { resolvePartnerFeatureEntitlements } from '../../services/mobile/mobilePackageEntitlementService';

export const MobileSuperAppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { currentUser, logout: authLogout } = useAuth();
  const {
    activeBooking,
    bookingHistory,
    toastMessage,
    partnerSubscription,
    showToast,
    mobileAuthUser,
    isExplicitlySignedOut,
    authModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
    logoutMobileSession,
  } = useMobileAppSession();

  const windowSearchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const getParam = (key: string) =>
    searchParams.get(key) ?? windowSearchParams?.get(key) ?? null;

  const initialModeParam = getParam('mode');
  const initialSlugParam = getParam('slug');
  const initialPersonaParam = getParam('persona') as MobilePersonaType | null;
  const explicitRoleParam = getParam('role');

  const isNativeCapacitor =
    typeof window !== 'undefined' &&
    Boolean((window as any).Capacitor?.isNativePlatform?.());

  const isLocalhostPreviewHost =
    typeof window !== 'undefined' &&
    !isNativeCapacitor &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const isLocalOrNativePreviewHost = isLocalhostPreviewHost || isNativeCapacitor;

  const isGuestSession =
    (explicitRoleParam === 'guest' && !partnerSubscription && !mobileAuthUser) ||
    (isExplicitlySignedOut && !mobileAuthUser && !partnerSubscription) ||
    (isNativeCapacitor && !mobileAuthUser && !partnerSubscription && !currentUser);

  const trustedMobileAuthRole: Role | null = mobileAuthUser
    ? isLocalOrNativePreviewHost
      ? mobileAuthUser.role
      : 'customer'
    : null;

  const effectiveRole: Role | 'guest' =
    isGuestSession
      ? 'guest'
      : partnerSubscription
        ? 'tenant_owner'
        : currentUser?.role
          ? currentUser.role
          : trustedMobileAuthRole
            ? trustedMobileAuthRole
            : isLocalhostPreviewHost
              ? 'tenant_owner'
              : 'guest';

  const signedInRole = currentUser?.role || trustedMobileAuthRole;
  const isSignedInPartnerAccount =
    signedInRole === 'tenant_owner' ||
    signedInRole === 'staff' ||
    signedInRole === 'super_admin';

  const hasPartnerEntitlement =
    effectiveRole === 'tenant_owner' ||
    effectiveRole === 'staff' ||
    effectiveRole === 'super_admin';

  const defaultStartupMode: MobileShellMode =
    hasPartnerEntitlement &&
    (initialModeParam === 'partner' ||
      (!initialModeParam && !initialSlugParam && isSignedInPartnerAccount))
      ? 'b2b_partner'
      : 'b2c_customer';

  const [requestedMode, setRequestedMode] = useState<MobileShellMode>(
    defaultStartupMode
  );
  const [requestedPersona, setRequestedPersona] = useState<
    MobilePersonaType | undefined
  >(
    hasPartnerEntitlement && initialPersonaParam
      ? initialPersonaParam
      : defaultStartupMode === 'b2b_partner'
        ? 'salon_partner'
        : 'salon_customer'
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultStartupMode === 'b2b_partner'
      ? 'partner_agenda'
      : initialSlugParam
        ? 'storefront'
        : 'explore'
  );
  const [partnerQuickAddTick, setPartnerQuickAddTick] = useState(0);
  const [partnerOnboardingOpen, setPartnerOnboardingOpen] = useState(false);
  const [quickBookCarouselOpen, setQuickBookCarouselOpen] = useState(false);
  const [bookingListing, setBookingListing] =
    useState<MobileDiscoveryListingItem | null>(null);
  const [bookingSpecialistName, setBookingSpecialistName] = useState<
    string | undefined
  >(undefined);
  const [bookingServiceNames, setBookingServiceNames] = useState<
    string[] | undefined
  >(undefined);
  const [attachedAiStyleNote, setAttachedAiStyleNote] = useState<
    string | undefined
  >(undefined);

  const tenantId = currentUser?.tenantId || 'ten-atelier-nisantasi';
  const tenantSlug =
    initialSlugParam ||
    (location.pathname.startsWith('/m/storefront/')
      ? location.pathname.split('/')[3]
      : null);

  const effectivePersonaResolved = hasPartnerEntitlement
    ? requestedPersona
    : requestedPersona === 'ht_patient'
      ? 'ht_patient'
      : 'salon_customer';

  const partnerEntitlements = useMemo(
    () =>
      resolvePartnerFeatureEntitlements({
        partnerSubscription,
        effectivePersona: hasPartnerEntitlement ? effectivePersonaResolved : undefined,
      }),
    [effectivePersonaResolved, hasPartnerEntitlement, partnerSubscription]
  );
  const b2cAiAvailable =
    hasPartnerEntitlement &&
    (partnerEntitlements.aiVisualizerEnabled ||
      (partnerEntitlements.clinicPersonaAllowed &&
        effectivePersonaResolved === 'clinic_practitioner') ||
      (partnerEntitlements.htPersonaAllowed &&
        effectivePersonaResolved === 'ht_coordinator'));

  useEffect(() => {
    if (tenantSlug) {
      setRequestedMode('b2c_customer');
      setRequestedPersona('salon_customer');
      setActiveTabId('storefront');
    }
  }, [tenantSlug]);

  useEffect(() => {
    const authParam = getParam('auth');
    if (authParam === 'login' || location.pathname === '/m/login') {
      openAuthModal('login');
    } else if (authParam === 'register' || location.pathname === '/m/register') {
      openAuthModal('register');
    }
  }, [location.pathname, openAuthModal]);

  const handleLogout = async () => {
    if (currentUser) {
      authLogout();
    }
    setRequestedMode('b2c_customer');
    setRequestedPersona('salon_customer');
    setActiveTabId(tenantSlug ? 'storefront' : 'explore');
    await logoutMobileSession();
  };

  const isDemoPreviewOrDemoCustomer =
    (!mobileAuthUser && isLocalhostPreviewHost && !isGuestSession) ||
    mobileAuthUser?.email.toLowerCase() === 'mert@randevulari.com' ||
    mobileAuthUser?.userId === 'usr-lari-mert';

  const shellState = useMemo(
    () =>
      resolveMobileShellState({
        userRole: effectiveRole,
        requestedMode,
        requestedPersona,
        verticals: {
          eligible: true,
          clinicEnabled: hasPartnerEntitlement
            ? partnerEntitlements.clinicPersonaAllowed
            : isDemoPreviewOrDemoCustomer,
          healthTourismEnabled: hasPartnerEntitlement
            ? partnerEntitlements.htPersonaAllowed
            : isDemoPreviewOrDemoCustomer,
          posInventoryEnabled: true,
          loyaltyWalletEnabled: true,
          aiVisualizerEnabled: b2cAiAvailable,
        },
        whiteLabelLockedTenantSlug: tenantSlug,
        activeLanguage: 'tr',
      }),
    [
      b2cAiAvailable,
      effectiveRole,
      hasPartnerEntitlement,
      isDemoPreviewOrDemoCustomer,
      partnerEntitlements.clinicPersonaAllowed,
      partnerEntitlements.htPersonaAllowed,
      requestedMode,
      requestedPersona,
      tenantSlug,
    ]
  );

  const handleSelectTab = (tab: MobileTabDescriptor) => {
    if (tab.id === 'quick_book') {
      if (tenantSlug) {
        const lockedListing =
          DEFAULT_MOBILE_MARKETPLACE_LISTINGS.find((item) => item.slug === tenantSlug) ||
          DEFAULT_MOBILE_MARKETPLACE_LISTINGS[0];
        handleOpenBooking({
          ...lockedListing,
          distanceKm: 0.4,
          estimatedTravelMinutes: 5,
        });
      } else {
        setQuickBookCarouselOpen(true);
      }
      return;
    }
    setActiveTabId(tab.id);
  };

  const handleSwitchPersona = (persona: MobilePersonaType) => {
    if (
      partnerSubscription &&
      ((persona === 'clinic_practitioner' && !partnerEntitlements.clinicPersonaAllowed) ||
        (persona === 'ht_coordinator' && !partnerEntitlements.htPersonaAllowed))
    ) {
      showToast('Bu role geçmek için Klinik veya Sağlık Turizmi paketine yükseltmelisiniz.');
      setPartnerOnboardingOpen(true);
      return;
    }
    setRequestedPersona(persona);
    const isPartnerPersona =
      persona === 'salon_partner' ||
      persona === 'clinic_practitioner' ||
      persona === 'ht_coordinator';
    setRequestedMode(isPartnerPersona ? 'b2b_partner' : 'b2c_customer');
    if (persona === 'ht_patient') {
      setActiveTabId('ht_concierge');
    } else if (persona === 'clinic_practitioner') {
      setActiveTabId('clinic_phi');
    } else if (persona === 'ht_coordinator') {
      setActiveTabId('ht_lead_ops');
    } else if (isPartnerPersona) {
      setActiveTabId('partner_agenda');
    } else {
      setActiveTabId(tenantSlug ? 'storefront' : 'explore');
    }
  };

  const handleGoToExplore = () => {
    setRequestedMode('b2c_customer');
    setRequestedPersona('salon_customer');
    setActiveTabId(tenantSlug ? 'storefront' : 'explore');
  };

  const handleToggleMode = (targetMode: MobileShellMode) => {
    setRequestedMode(targetMode);
    if (targetMode === 'b2b_partner') {
      setRequestedPersona('salon_partner');
      setActiveTabId('partner_agenda');
    } else {
      setRequestedPersona('salon_customer');
      setActiveTabId(tenantSlug ? 'storefront' : 'explore');
    }
  };

  const handleOpenBooking = (
    listing: MobileDiscoveryListingItem,
    specialist?: StorefrontSpecialistProfile,
    serviceNames?: string[]
  ) => {
    setBookingListing(listing);
    setBookingSpecialistName(specialist?.name);
    setBookingServiceNames(serviceNames);
  };

  const renderBody = () => {
    switch (activeTabId) {
      case 'explore':
      case 'storefront':
        return (
          <MobileExploreMarketplacePage
            whiteLabelLockedTenantSlug={tenantSlug}
            pastAppointments={
              isGuestSession
                ? []
                : bookingHistory
                    .filter((item) => item.status === 'completed' || item.status === 'confirmed')
                    .slice(0, 1)
                    .map((item) => ({
                      appointmentId: item.appointmentId,
                      tenantId: item.tenantId,
                      tenantSlug: item.tenantSlug,
                      businessName: item.businessName,
                      serviceId: 'srv-rebook',
                      serviceName: item.serviceName,
                      staffId: 'st-1',
                      staffName: item.specialistName,
                      durationMinutes: 90,
                      priceMajor: item.priceMajor,
                      currency: item.currency,
                      completedAtIso: `${item.scheduledDate}T${item.scheduledTime}:00Z`,
                    }))
            }
            onOpenBookingSheet={handleOpenBooking}
            onOneTapRebook={() => {
              const first = DEFAULT_MOBILE_MARKETPLACE_LISTINGS[0];
              handleOpenBooking({
                ...first,
                distanceKm: 0.4,
                estimatedTravelMinutes: 5,
              });
            }}
            onOpenPartnerOnboarding={() => setPartnerOnboardingOpen(true)}
            onOpenProfile={() => setActiveTabId('profile')}
          />
        );
      case 'wallet':
        return (
          <MobileCustomerWalletPage
            tenantId={tenantId}
            isGuestSession={isGuestSession}
            onGoToExplore={handleGoToExplore}
          />
        );
      case 'ai_style':
        return (
          <MobileAIStyleVisualizerPage
            tenantId={tenantId}
            onAttachStyleToBooking={(note) => {
              setAttachedAiStyleNote(note);
              const first = DEFAULT_MOBILE_MARKETPLACE_LISTINGS[0];
              handleOpenBooking({
                ...first,
                distanceKm: 0.4,
                estimatedTravelMinutes: 5,
              });
            }}
          />
        );
      case 'ht_concierge':
        if (isGuestSession || !shellState.availablePersonas.includes('ht_patient')) {
          return (
            <div
              className="rounded-3xl bg-white border border-slate-200 p-6 text-center space-y-3 shadow-sm"
              data-testid="ht-concierge-locked-card"
            >
              <p className="text-sm font-black text-[#111827]">
                Sağlık Turizmi VIP Konsiyerj Erişimi
              </p>
              <p className="text-xs text-slate-500">
                Bu alan yalnızca tedavi planı ve transfer daveti tanımlanmış hastalar ile yetkili demo hesapları için açıktır.
              </p>
              {isGuestSession && (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="min-h-11 px-5 rounded-xl bg-[#4F46E5] text-white text-xs font-black"
                >
                  Giriş Yap / Demo İncele
                </button>
              )}
            </div>
          );
        }
        return <MobileHealthTourismConciergePage tenantId={tenantId} />;
      case 'profile':
      case 'partner_switch':
        return (
          <MobileProfileSettingsPage
            tenantId={tenantId}
            userId={mobileAuthUser?.userId || currentUser?.id || 'usr-mobile-demo'}
            userRole={effectiveRole === 'guest' ? 'customer' : effectiveRole}
            shellState={shellState}
            isGuestSession={isGuestSession}
            onLogout={handleLogout}
            onToggleMode={handleToggleMode}
            onSwitchPersona={handleSwitchPersona}
            onOpenPartnerOnboarding={() => setPartnerOnboardingOpen(true)}
          />
        );
      case 'partner_agenda':
        return (
          <MobilePartnerAgendaAndInboxPage
            tenantId={tenantId}
            userRole={effectiveRole}
            initialTabFocus="agenda"
            partnerQuickAddTick={partnerQuickAddTick}
            effectivePersona={shellState.effectivePersona}
            onRequestPlanUpgrade={() => setPartnerOnboardingOpen(true)}
          />
        );
      case 'social_feed':
        return <MobileSocialFeedPage onOpenBookingSheet={handleOpenBooking} />;
      case 'partner_inbox':
        return (
          <MobilePartnerAgendaAndInboxPage
            tenantId={tenantId}
            userRole={effectiveRole}
            initialTabFocus="inbox"
            effectivePersona={shellState.effectivePersona}
            onRequestPlanUpgrade={() => setPartnerOnboardingOpen(true)}
          />
        );
      case 'partner_pos':
        return (
          <MobilePartnerPosAndInventoryPage
            tenantId={tenantId}
            userRole={effectiveRole}
            effectivePersona={shellState.effectivePersona}
            onRequestPlanUpgrade={() => setPartnerOnboardingOpen(true)}
          />
        );
      case 'clinic_phi':
        return <MobilePartnerClinicWorkspacePage />;
      case 'ht_lead_ops':
        return <MobilePartnerHtLeadOpsPage />;
      case 'customer_360':
        return <MobilePartnerCustomer360Page />;
      default:
        return (
          <MobileExploreMarketplacePage
            whiteLabelLockedTenantSlug={tenantSlug}
            onOpenBookingSheet={handleOpenBooking}
            onOpenPartnerOnboarding={() => setPartnerOnboardingOpen(true)}
            onOpenProfile={() => setActiveTabId('profile')}
          />
        );
    }
  };

  return (
    <>
      <MobileAppShell
        shellState={shellState}
        activeTabId={activeTabId}
        isGuestSession={isGuestSession}
        onSelectTab={handleSelectTab}
        onSwitchPersona={handleSwitchPersona}
        onToggleMode={handleToggleMode}
        onQuickPlusAction={() => {
          if (shellState.effectiveMode === 'b2b_partner') {
            setPartnerQuickAddTick((current) => current + 1);
            setActiveTabId('partner_agenda');
            return;
          }
          if (tenantSlug) {
            const lockedListing =
              DEFAULT_MOBILE_MARKETPLACE_LISTINGS.find(
                (item) => item.slug === tenantSlug
              ) || DEFAULT_MOBILE_MARKETPLACE_LISTINGS[0];
            handleOpenBooking({
              ...lockedListing,
              distanceKm: 0.4,
              estimatedTravelMinutes: 5,
            });
          } else {
            setQuickBookCarouselOpen(true);
          }
        }}
        onNotificationBellClick={() => {
          setActiveTabId(shellState.effectiveMode === 'b2b_partner' ? 'partner_inbox' : 'wallet');
        }}
        onBrandHeaderClick={() => {
          setActiveTabId(shellState.effectiveMode === 'b2b_partner' ? 'partner_switch' : 'profile');
        }}
        businessDisplayName={
          tenantSlug ? `Mağaza: ${tenantSlug}` : 'LARİ Super-App'
        }
        branchDisplayName="Nişantaşı Merkez"
      >
        {(activeTabId === 'explore' || activeTabId === 'storefront') && (
          <div className="-mx-3.5 -mt-3 mb-3">
            <MobileStoryOnboarding
              onNavigateExperience={({ mode, persona, tabId }) => {
                if (
                  (tabId === 'ht_concierge' || persona === 'ht_patient') &&
                  (isGuestSession || !shellState.availablePersonas.includes('ht_patient'))
                ) {
                  if (isGuestSession) {
                    openAuthModal('login');
                    showToast('Sağlık Turizmi VIP konsiyerjini görmek için giriş yapın veya demo hesabı seçin.');
                  } else {
                    showToast('Sağlık Turizmi konsiyerji yalnızca davetli VIP hastalar için aktiftir.');
                  }
                  return;
                }
                if (mode) setRequestedMode(mode);
                if (persona) setRequestedPersona(persona);
                if (tabId) setActiveTabId(tabId);
              }}
            />
          </div>
        )}

        {renderBody()}
      </MobileAppShell>

      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[#5B5FEF]/20 bg-white/95 px-4 py-3 text-center text-sm font-semibold text-[#4338CA] shadow-lg backdrop-blur-md"
          data-testid="mobile-session-toast"
        >
          {toastMessage}
        </div>
      ) : null}

      {quickBookCarouselOpen ? (
        <MobileQuickBookCarouselSheet
          listings={DEFAULT_MOBILE_MARKETPLACE_LISTINGS}
          onClose={() => setQuickBookCarouselOpen(false)}
          onOpenBooking={(listing, specialist, serviceNames) => {
            setQuickBookCarouselOpen(false);
            handleOpenBooking(listing, specialist, serviceNames);
          }}
        />
      ) : null}

      {bookingListing && (
        <MobileBookingBottomSheet
          listing={bookingListing}
          preselectedSpecialistName={bookingSpecialistName}
          preselectedServiceNames={bookingServiceNames}
          attachedStyleNote={attachedAiStyleNote}
          onBookingConfirmed={() => {
            setBookingListing(null);
            setBookingSpecialistName(undefined);
            setBookingServiceNames(undefined);
            setActiveTabId('wallet');
          }}
          onClose={() => {
            setBookingListing(null);
            setBookingSpecialistName(undefined);
            setBookingServiceNames(undefined);
          }}
        />
      )}

      {partnerOnboardingOpen ? (
        <MobilePartnerOnboardingFunnel
          onClose={() => setPartnerOnboardingOpen(false)}
          onCompleted={({ switchToPartnerMode }) => {
            setPartnerOnboardingOpen(false);
            if (switchToPartnerMode) {
              setRequestedMode('b2b_partner');
              setRequestedPersona('salon_partner');
              setActiveTabId('partner_agenda');
            }
          }}
        />
      ) : null}

      <MobileAuthModal
        open={authModalOpen}
        initialTab={authModalInitialTab}
        onClose={closeAuthModal}
        onAuthenticated={({ role, isNewPartnerSignup }) => {
          if (isNewPartnerSignup) {
            setPartnerOnboardingOpen(true);
            return;
          }
          if (role === 'tenant_owner') {
            setRequestedMode('b2b_partner');
            setRequestedPersona('salon_partner');
            setActiveTabId('partner_agenda');
          } else {
            setRequestedMode('b2c_customer');
            setRequestedPersona('salon_customer');
            setActiveTabId(tenantSlug ? 'storefront' : 'explore');
          }
        }}
      />
    </>
  );
};

export const MobileSuperAppPage: React.FC = () => (
  <MobileAppSessionProvider>
    <MobileSuperAppContent />
  </MobileAppSessionProvider>
);

export default MobileSuperAppPage;
