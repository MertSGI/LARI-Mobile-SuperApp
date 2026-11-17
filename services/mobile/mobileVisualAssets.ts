export type MobileVisualCategory =
  | 'beauty_salon'
  | 'barber'
  | 'dental_clinic'
  | 'aesthetic_clinic'
  | 'spa_wellness'
  | 'health_tourism'
  | 'auto_service'
  | 'nail_studio'
  | 'physiotherapy'
  | 'dietitian'
  | 'pet_grooming'
  | 'personal_trainer';

export interface MobileCategoryArtwork {
  label: string;
  alt: string;
  photoUrl: string;
  svgUrl: string;
  accentColor: string;
  backgroundColor: string;
}

export interface VenueVisualAsset {
  coverPhotoUrl: string;
  galleryPhotoUrls: string[];
  fallbackSvgUrl: string;
  logoMonogram: string;
  logoBgColor: string;
  brandShortName: string;
  phone: string;
  address: string;
  totalBookingsCount: number;
  specialties: string[];
}

function svgDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    svg.replace(/\s{2,}/g, ' ').trim()
  );
}

function categoryArtwork(
  label: string,
  accentColor: string,
  backgroundColor: string,
  symbol: string,
  photoUrl: string
): MobileCategoryArtwork {
  const safeLabel = label.replace(/&/g, '&amp;');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" role="img" aria-label="' + safeLabel + '">',
    '<rect width="320" height="220" rx="30" fill="' + backgroundColor + '"/>',
    '<circle cx="250" cy="42" r="58" fill="' + accentColor + '" opacity=".08"/>',
    '<circle cx="52" cy="190" r="76" fill="' + accentColor + '" opacity=".06"/>',
    '<rect x="42" y="34" width="236" height="152" rx="24" fill="#fff" stroke="#E2E8F0"/>',
    '<path d="M70 151c35-53 72-78 111-75 30 3 52 23 69 59" fill="none" stroke="' + accentColor + '" stroke-width="9" stroke-linecap="round"/>',
    '<circle cx="122" cy="101" r="23" fill="' + accentColor + '" opacity=".14"/>',
    '<path d="' + symbol + '" fill="none" stroke="' + accentColor + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    '<text x="160" y="174" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="16" font-weight="700">' + safeLabel + '</text>',
    '</svg>',
  ].join('');

  return {
    label,
    alt: label + ' kategorisi',
    photoUrl,
    accentColor,
    backgroundColor,
    svgUrl: svgDataUri(svg),
  };
}

export const MOBILE_CATEGORY_ARTWORKS: Record<
  MobileVisualCategory,
  MobileCategoryArtwork
> = {
  beauty_salon: categoryArtwork(
    'Güzellik Salonu',
    '#5B5FEF',
    '#F3F4FF',
    'M112 119c19-8 34-24 39-45M145 121c-11-16-11-32 0-48',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85'
  ),
  barber: categoryArtwork(
    'Berber',
    '#8B5E3C',
    '#FAF6F1',
    'M107 75l47 57M154 75l-47 57M103 72l8 8M150 128l8 8',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85'
  ),
  dental_clinic: categoryArtwork(
    'Diş Kliniği',
    '#0891B2',
    '#ECFEFF',
    'M112 78c-10 15-2 53 14 58 8 3 8-21 15-21s7 24 15 21c16-5 24-43 14-58-10-15-20-5-29-5s-19-10-29 5z',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85'
  ),
  aesthetic_clinic: categoryArtwork(
    'Estetik Klinik',
    '#DB2777',
    '#FDF2F8',
    'M115 123c24-4 39-22 43-48M113 105c11 8 25 9 38 2M128 85h1M153 89h1',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=85'
  ),
  spa_wellness: categoryArtwork(
    'Spa & Wellness',
    '#059669',
    '#ECFDF5',
    'M95 120c19-31 38-31 57 0 19-31 38-31 57 0M152 120V78M132 95l20-17 20 17',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=85'
  ),
  health_tourism: categoryArtwork(
    'Sağlık Turizmi',
    '#2563EB',
    '#EFF6FF',
    'M105 105h28V77h20v28h28v20h-28v28h-20v-28h-28zM191 80c15 4 25 17 25 33',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=85'
  ),
  auto_service: categoryArtwork(
    'Oto Bakım & Servis',
    '#334155',
    '#F1F5F9',
    'M98 118l16-32h92l16 32M95 118h130v22H95zM122 140v8M198 140v8',
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=85'
  ),
  nail_studio: categoryArtwork(
    'Tırnak & İpek Kirpik',
    '#C026D3',
    '#FDF4FF',
    'M106 130c12-40 24-59 36-59s19 20 19 59M172 130c4-34 13-51 27-51 12 0 18 17 17 51',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85'
  ),
  physiotherapy: categoryArtwork(
    'Fizyoterapi & Rehabilitasyon',
    '#0284C7',
    '#F0F9FF',
    'M124 81c20 0 36 16 36 36v37M160 118h47M112 151h96',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85'
  ),
  dietitian: categoryArtwork(
    'Diyetisyen & Beslenme',
    '#65A30D',
    '#F7FEE7',
    'M112 119c12-35 38-49 70-31 17 10 24 36 11 53M151 78c8 6 13 14 14 25',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85'
  ),
  pet_grooming: categoryArtwork(
    'Pet Kuaför & Vet',
    '#D97706',
    '#FFFBEB',
    'M135 128c0-15 12-26 25-26s25 11 25 26-10 18-25 18-25-3-25-18zM122 92h1M146 78h1M174 78h1M198 92h1',
    'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=85'
  ),
  personal_trainer: categoryArtwork(
    'Spor & Koçluk',
    '#4F46E5',
    '#EEF2FF',
    'M108 108h104M118 90v36M202 90v36M106 96v24M214 96v24',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'
  ),
};

function venueFallback(
  brand: string,
  monogram: string,
  accentColor: string,
  scene: 'salon' | 'clinic' | 'barber' | 'spa' | 'aesthetic'
): string {
  const safeBrand = brand.replace(/&/g, '&amp;');
  const sceneLines: Record<typeof scene, string> = {
    salon:
      '<path d="M72 232V98h142v134M104 232v-86h78v86M246 232V72h120v160" fill="none" stroke="#CBD5E1" stroke-width="10"/>',
    clinic:
      '<rect x="65" y="78" width="300" height="154" rx="18" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="8"/><path d="M195 112h38v38h38v38h-38v38h-38v-38h-38v-38h38z" fill="' +
      accentColor +
      '" opacity=".7"/>',
    barber:
      '<path d="M82 232V87h98v145M223 232V87h98v145M105 116h52M246 116h52" stroke="#CBD5E1" stroke-width="10" fill="none"/><circle cx="201" cy="113" r="25" fill="' +
      accentColor +
      '" opacity=".16"/>',
    spa:
      '<path d="M52 219c62-83 126-83 192 0 56-62 111-62 164 0" fill="none" stroke="#CBD5E1" stroke-width="12"/><circle cx="328" cy="76" r="28" fill="' +
      accentColor +
      '" opacity=".2"/>',
    aesthetic:
      '<path d="M76 224V82h282v142M116 118h202M157 224v-72h120v72" fill="none" stroke="#CBD5E1" stroke-width="10"/><circle cx="217" cy="116" r="32" fill="' +
      accentColor +
      '" opacity=".14"/>',
  };

  return svgDataUri(
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="' + safeBrand + '">',
      '<rect width="480" height="300" fill="#F8F9FB"/>',
      '<circle cx="420" cy="24" r="130" fill="' + accentColor + '" opacity=".08"/>',
      sceneLines[scene],
      '<rect x="30" y="246" width="420" height="34" rx="17" fill="#fff" opacity=".96"/>',
      '<circle cx="55" cy="263" r="13" fill="' + accentColor + '"/>',
      '<text x="55" y="268" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="11" font-weight="700">' + monogram + '</text>',
      '<text x="78" y="269" fill="#111827" font-family="Arial, sans-serif" font-size="15" font-weight="700">' + safeBrand + '</text>',
      '</svg>',
    ].join('')
  );
}

export const VENUE_VISUAL_CATALOG: Record<string, VenueVisualAsset> = {
  'atelier-nisantasi': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('Atelier Nişantaşı', 'AN', '#5B5FEF', 'salon'),
    logoMonogram: 'AN',
    logoBgColor: '#5B5FEF',
    brandShortName: 'Atelier',
    phone: '+90 212 555 01 40',
    address: 'Teşvikiye Mah. Abdi İpekçi Cad. No: 28, Nişantaşı / İstanbul',
    totalBookingsCount: 2840,
    specialties: ['Soft Balayage', 'Renk Tasarımı', 'Keratin Bakım'],
  },
  'lari-dent-kadikoy': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('LARİ Dent Kadıköy', 'LD', '#0891B2', 'clinic'),
    logoMonogram: 'LD',
    logoBgColor: '#0891B2',
    brandShortName: 'LARİ Dent',
    phone: '+90 216 555 22 18',
    address: 'Caferağa Mah. Moda Cad. No: 41, Kadıköy / İstanbul',
    totalBookingsCount: 1965,
    specialties: ['Dijital Gülüş Tasarımı', 'E-Max', 'Koruyucu Diş Hekimliği'],
  },
  'no9-barber-club': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('No.9 Barber Club', 'N9', '#8B5E3C', 'barber'),
    logoMonogram: 'N9',
    logoBgColor: '#8B5E3C',
    brandShortName: 'No.9',
    phone: '+90 212 555 09 09',
    address: 'Sinanpaşa Mah. Şair Nedim Cad. No: 9, Beşiktaş / İstanbul',
    totalBookingsCount: 1740,
    specialties: ['Skin Fade', 'Sıcak Havlu Sakal', 'Erkek Bakım'],
  },
  'aura-holistic-spa-bebek': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('Aura Holistic Spa', 'AU', '#059669', 'spa'),
    logoMonogram: 'AU',
    logoBgColor: '#059669',
    brandShortName: 'Aura',
    phone: '+90 212 555 76 20',
    address: 'Bebek Mah. Cevdet Paşa Cad. No: 72, Beşiktaş / İstanbul',
    totalBookingsCount: 2318,
    specialties: ['Aromaterapi', 'Derin Doku', 'Longevity Ritüelleri'],
  },
  'dr-selin-aesthetics-etiler': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1666887360642-380f1e0984e2?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('Dr. Selin Aesthetics', 'DS', '#DB2777', 'aesthetic'),
    logoMonogram: 'DS',
    logoBgColor: '#DB2777',
    brandShortName: 'Dr. Selin',
    phone: '+90 212 555 34 75',
    address: 'Etiler Mah. Nispetiye Cad. No: 63, Beşiktaş / İstanbul',
    totalBookingsCount: 1526,
    specialties: ['Medikal Cilt Bakımı', 'Hydrafacial', 'Eksozom Protokolü'],
  },
  'maslak-auto-studio': {
    coverPhotoUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=88',
    galleryPhotoUrls: [
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7e5e?auto=format&fit=crop&w=1600&q=88',
      'https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1600&q=88',
    ],
    fallbackSvgUrl: venueFallback('Maslak Auto Servis', 'MA', '#334155', 'clinic'),
    logoMonogram: 'MA',
    logoBgColor: '#334155',
    brandShortName: 'Maslak Auto',
    phone: '+90 212 555 88 10',
    address: 'Atatürk Oto Sanayi Sitesi 2. Kısım No: 14, Maslak / İstanbul',
    totalBookingsCount: 3190,
    specialties: ['Periyodik Bakım', 'Detailing & Seramik', 'Bilgisayarlı Arıza Tespiti'],
  },
};

export const AI_STUDIO_PORTRAIT_FALLBACK = svgDataUri(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900" role="img" aria-label="AI stüdyo portre önizlemesi">',
    '<rect width="720" height="900" fill="#F1F3F9"/>',
    '<circle cx="360" cy="275" r="156" fill="#E1C7B5"/>',
    '<path d="M197 279c0-150 75-224 173-224 111 0 177 84 160 254-45-56-91-92-171-92-65 0-111 23-162 62z" fill="#40352F"/>',
    '<path d="M170 900c13-240 86-351 190-351s177 111 190 351z" fill="#5B5FEF"/>',
    '<path d="M267 319c25 18 161 18 187 0-15 111-65 177-94 177s-78-66-93-177z" fill="#E7CDBB"/>',
    '<circle cx="303" cy="293" r="8" fill="#2F2926"/><circle cx="417" cy="293" r="8" fill="#2F2926"/>',
    '<path d="M326 389c23 15 46 15 69 0" fill="none" stroke="#A95E64" stroke-width="9" stroke-linecap="round"/>',
    '<circle cx="615" cy="104" r="58" fill="#fff" opacity=".85"/>',
    '<path d="M615 77v54M588 104h54" stroke="#5B5FEF" stroke-width="9" stroke-linecap="round"/>',
    '<rect x="58" y="795" width="604" height="62" rx="31" fill="#fff" opacity=".94"/>',
    '<text x="360" y="834" text-anchor="middle" fill="#4338CA" font-family="Arial, sans-serif" font-size="22" font-weight="700">LARİ AI Studio • Fotoğrafını ekleyerek başla</text>',
    '</svg>',
  ].join('')
);

export { svgDataUri as createMobileSvgDataUri };
