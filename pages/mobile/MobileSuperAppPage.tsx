import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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
import { StorefrontSpecialistProfile } from '../../components/mobile/b2c/MobileStorefrontDetailDrawer';
import MobileCustomerWalletPage from './b2c/MobileCustomerWalletPage';
import MobileAIStyleVisualizerPage from './b2c/MobileAIStyleVisualizerPage';
import MobileHealthTourismConciergePage from './b2c/MobileHealthTourismConciergePage';
import MobileProfileSettingsPage from './MobileProfileSettingsPage';
import MobilePartnerAgendaAndInboxPage from './partner/MobilePartnerAgendaAndInboxPage';
import MobilePartnerPosAndInventoryPage from './partner/MobilePartnerPosAndInventoryPage';
import MobilePartnerClinicWorkspacePage from './partner/MobilePartnerClinicWorkspacePage';
import MobilePartnerHtLeadOpsPage from './partner/MobilePartnerHtLeadOpsPage';
import MobilePartnerCustomer360Page from './partner/MobilePartnerCustomer360Page';

export const MobileSuperAppPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { currentUser } = useAuth();

  const initialModeParam = searchParams.get('mode');
  const initialSlugParam = searchParams.get('slug');
  const initialPersonaParam = searchParams.get(
    'persona'
  ) as MobilePersonaType | null;
  const explicitRoleParam = searchParams.get('role');

  const isLocalOrNativePreviewHost =
    typeof window !== 'undefined' &&
    (['localhost', '127.0.0.1', 'app.randevulari.com', 'app.lari.app'].includes(
      window.location.hostname
    ) ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()));

  const effectiveRole: Role | 'guest' =
    explicitRoleParam === 'guest'
      ? 'guest'
      : currentUser?.role
        ? currentUser.role
        : isLocalOrNativePreviewHost || initialModeParam === 'partner'
          ? 'tenant_owner'
          : 'guest';

  const [requestedMode, setRequestedMode] = useState<MobileShellMode>(
    initialModeParam === 'partner' ? 'b2b_partner' : 'b2c_customer'
  );
  const [requestedPersona, setRequestedPersona] = useState<
    MobilePersonaType | undefined
  >(
    initialPersonaParam ||
      (initialModeParam === 'partner' ? 'salon_partner' : 'salon_customer')
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    initialModeParam === 'partner'
      ? 'partner_agenda'
      : initialSlugParam
        ? 'storefront'
        : 'explore'
  );
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
          aiVisualizerEnabled: true,
        },
        whiteLabelLockedTenantSlug: tenantSlug,
        activeLanguage: 'tr',
      }),
    [effectiveRole, requestedMode, requestedPersona, tenantSlug]
  );

  const handleSelectTab = (tab: MobileTabDescriptor) => {
    if (tab.id === 'quick_book') {
      const first = DEFAULT_MOBILE_MARKETPLACE_LISTINGS[0];
      setBookingListing({
        ...first,
        distanceKm: 0.4,
        estimatedTravelMinutes: 5,
      });
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
          />
        );
      case 'wallet':
        return <MobileCustomerWalletPage tenantId={tenantId} />;
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
          />
        );
      case 'partner_agenda':
      case 'partner_inbox':
        return (
          <MobilePartnerAgendaAndInboxPage
            tenantId={tenantId}
            userRole={effectiveRole}
          />
        );
      case 'partner_pos':
        return (
          <MobilePartnerPosAndInventoryPage
            tenantId={tenantId}
            userRole={effectiveRole}
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
        businessDisplayName={
          tenantSlug ? `Mağaza: ${tenantSlug}` : 'LARİ Super-App'
        }
        branchDisplayName="Nişantaşı Merkez"
      >
        {/* Top Interactive Story Reels & Full-Screen Onboarding Launcher */}
        <div className="-mx-3.5 -mt-4 mb-3">
          <MobileStoryOnboarding
            onNavigateExperience={({ mode, persona, tabId }) => {
              if (mode) setRequestedMode(mode);
              if (persona) setRequestedPersona(persona);
              if (tabId) setActiveTabId(tabId);
            }}
          />
        </div>

        {renderBody()}
      </MobileAppShell>

      {bookingListing && (
        <MobileBookingBottomSheet
          listing={bookingListing}
          preselectedSpecialistName={bookingSpecialistName}
          preselectedServiceNames={bookingServiceNames}
          attachedStyleNote={attachedAiStyleNote}
          onClose={() => {
            setBookingListing(null);
            setBookingSpecialistName(undefined);
            setBookingServiceNames(undefined);
          }}
        />
      )}
    </>
  );
};

export default MobileSuperAppPage;
