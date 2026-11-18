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
  const { currentUser } = useAuth();
  const { activeBooking, toastMessage, partnerSubscription } =
    useMobileAppSession();

  const windowSearchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const getParam = (key: string) =>
    searchParams.get(key) ?? windowSearchParams?.get(key) ?? null;

  const initialModeParam = getParam('mode');
  const initialSlugParam = getParam('slug');
  const initialPersonaParam = getParam('persona') as MobilePersonaType | null;
  const explicitRoleParam = getParam('role');

  const isLocalOrNativePreviewHost =
    typeof window !== 'undefined' &&
    (['localhost', '127.0.0.1', 'app.randevulari.com', 'app.lari.app'].includes(
      window.location.hostname
    ) ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()));

  const effectiveRole: Role | 'guest' =
    explicitRoleParam === 'guest' && !partnerSubscription
      ? 'guest'
      : partnerSubscription
        ? 'tenant_owner'
      : currentUser?.role
        ? currentUser.role
        : isLocalOrNativePreviewHost || initialModeParam === 'partner'
          ? 'tenant_owner'
          : 'guest';

  const isSignedInPartnerAccount =
    currentUser?.role === 'tenant_owner' ||
    currentUser?.role === 'staff' ||
    currentUser?.role === 'super_admin';

  const defaultStartupMode: MobileShellMode =
    initialModeParam === 'partner' ||
    (!initialModeParam && !initialSlugParam && isSignedInPartnerAccount)
      ? 'b2b_partner'
      : 'b2c_customer';

  const [requestedMode, setRequestedMode] = useState<MobileShellMode>(
    defaultStartupMode
  );
  const [requestedPersona, setRequestedPersona] = useState<
    MobilePersonaType | undefined
  >(
    initialPersonaParam ||
      (defaultStartupMode === 'b2b_partner' ? 'salon_partner' : 'salon_customer')
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

  const partnerEntitlements = useMemo(
    () =>
      resolvePartnerFeatureEntitlements({
        partnerSubscription,
        effectivePersona: requestedPersona,
      }),
    [partnerSubscription, requestedPersona]
  );
  const b2cAiAvailable =
    partnerEntitlements.aiVisualizerEnabled ||
    requestedPersona === 'ht_patient' ||
    requestedPersona === 'clinic_practitioner' ||
    requestedPersona === 'ht_coordinator';

  useEffect(() => {
    if (tenantSlug) {
      setRequestedMode('b2c_customer');
      setRequestedPersona('salon_customer');
      setActiveTabId('storefront');
    }
  }, [tenantSlug]);

  const shellState = useMemo(
    () =>
      resolveMobileShellState({
        userRole: effectiveRole,
        requestedMode,
        requestedPersona,
        verticals: {
          eligible: true,
          clinicEnabled: true,
          healthTourismEnabled: true,
          posInventoryEnabled: true,
          loyaltyWalletEnabled: true,
          aiVisualizerEnabled: b2cAiAvailable,
        },
        whiteLabelLockedTenantSlug: tenantSlug,
        activeLanguage: 'tr',
      }),
    [b2cAiAvailable, effectiveRole, requestedMode, requestedPersona, tenantSlug]
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
            pastAppointments={[
              {
                appointmentId: 'apt-prev-1',
                tenantId,
                tenantSlug: 'atelier-nisantasi',
                businessName: 'Atelier Nişantaşı Hair & Spa',
                serviceId: 'srv-balayage',
                serviceName: 'Soft Balayage & Bakım',
                staffId: 'st-merve',
                staffName: 'Merve Yılmaz',
                durationMinutes: 120,
                priceMajor: 4200,
                currency: 'TRY',
                completedAtIso: '2026-11-01T14:00:00Z',
              },
            ]}
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
          />
        );
      case 'wallet':
        return (
          <MobileCustomerWalletPage
            tenantId={tenantId}
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
        return <MobileHealthTourismConciergePage tenantId={tenantId} />;
      case 'profile':
      case 'partner_switch':
        return (
          <MobileProfileSettingsPage
            tenantId={tenantId}
            userId={currentUser?.id || 'usr-mobile-demo'}
            userRole={effectiveRole === 'guest' ? 'customer' : effectiveRole}
            shellState={shellState}
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
          />
        );
    }
  };

  return (
    <>
      <MobileAppShell
        shellState={shellState}
        activeTabId={activeTabId}
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
    </>
  );
};

export const MobileSuperAppPage: React.FC = () => (
  <MobileAppSessionProvider>
    <MobileSuperAppContent />
  </MobileAppSessionProvider>
);

export default MobileSuperAppPage;
