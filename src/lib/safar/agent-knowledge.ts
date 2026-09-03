/**
 * SAFAR N MANZIL — Business Domain Knowledge & Agent Intelligence Engine
 *
 * Implements domain intelligence for the two core SAFAR pillars:
 * 1. "Safar Go": Comprehensive Gulf travel assistance from India
 *    (flight bookings, baggage packing guidelines, prohibited/allowed items,
 *     boxes/scales, visa guidance, airport transit, homemade food & spices).
 * 2. "Safar Home": NRI family assistance back home in India
 *    (elderly parent care, medical coordination, doctor appointments,
 *     emergency local support, grocery delivery, home maintenance/repairs).
 */

export type SafarCategory = 'safar_go' | 'safar_home';

export interface CategorizationResult {
  category: SafarCategory;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: SafarCategory;
  tags: string[];
}

export interface AgentKnowledgeResponse {
  category: SafarCategory;
  greeting: string;
  summary: string;
  faqs: FAQItem[];
  previewText: string;
}

/**
 * Domain specifications for Safar Go (Gulf Travel Assistance)
 */
export const SAFAR_GO_KNOWLEDGE = {
  pillar: 'Safar Go',
  description: 'Specialized travel and relocation assistance from India to Gulf/GCC countries (UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain).',
  services: [
    'Flight bookings & competitive itinerary planning',
    'Baggage packing guidelines & weight compliance (scales, carton boxes, heavy-duty duffel bags)',
    'Customs compliance & prohibited vs. allowed items (spices, homemade food, sweets, medicines)',
    'Visa application, stamping & document clearance guidance',
    'Airport transit & terminal transfers in Gulf international hubs',
    'Pre-departure checklists and travel orientation for first-time emigrants',
  ],
  packingGuidelines: {
    cartonBoxDimensions: 'Standard 70cm x 50cm x 40cm double-walled corrugated box',
    maxWeightPerPiece: '23kg or 30kg depending on airline baggage allowance',
    prohibitedItems: [
      'Poppy seeds (Khus Khus / Posto) — STRICTLY BANNED in UAE and all GCC nations',
      'Betel leaves (Paan), Gutkha, and unapproved tobacco products',
      'Narcotic, psychotropic, or controlled medications without attested medical prescription',
      'Unlabeled food items, raw unpeeled meat/poultry',
      'E-cigarettes, vapes, and power banks in checked baggage (carry-on only)',
    ],
    allowedItemsWithGuidelines: [
      'Homemade dry sweets & snacks (vacuum sealed)',
      'Ground and whole spices (packed in airtight, commercial-grade sealed packets)',
      'Cooked food / theplas / pickles in leak-proof sealed plastic containers',
      'Doctor-prescribed chronic medicines with valid physical doctor prescription & invoice',
    ],
  },
};

/**
 * Domain specifications for Safar Home (NRI Family Support Back Home)
 */
export const SAFAR_HOME_KNOWLEDGE = {
  pillar: 'Safar Home',
  description: 'Dedicated on-ground family welfare and property management for Gulf NRIs with loved ones in India.',
  services: [
    'Elderly parent routine welfare visits, companion care, and vitals monitoring',
    'Medical appointment coordination, hospital escorts & specialist doctor consultations',
    'Monthly prescription medicine procurement and doorstep delivery',
    '24/7 on-call emergency local support and rapid ambulance/hospital admission dispatch',
    'Essential household provisions, grocery replenishment, and utility bill clearing',
    'Home maintenance, electrical repairs, plumbing, and seasonal AC servicing',
  ],
  elderlyCareStandards: [
    'Trained, compassionate local care companions',
    'Regular vitals tracking (blood pressure, sugar levels, pulse oximetry)',
    'Real-time WhatsApp health summaries sent directly to the NRI sponsor in the Gulf',
    'Doorstep sample collection for diagnostic laboratory tests',
  ],
  maintenanceScope: [
    'Verified local plumbers, certified electricians, and HVAC technicians',
    'Before-and-after photo/video documentation sent via WhatsApp',
    'Transparent cost estimation with no surprise surcharges',
  ],
};

/**
 * Curated knowledge base FAQs
 */
export const SAFAR_FAQS: Record<SafarCategory, FAQItem[]> = {
  safar_go: [
    {
      id: 'go_faq_1',
      category: 'safar_go',
      question: 'What food items and spices can I pack for travel to the Gulf?',
      answer: 'You can pack vacuum-sealed homemade snacks, dry sweets, and ground spices in airtight sealed packets. Strictly note that poppy seeds (khus khus) and betel leaves are severely prohibited under GCC customs laws and carry severe criminal penalties.',
      tags: ['food', 'packing', 'spices', 'customs'],
    },
    {
      id: 'go_faq_2',
      category: 'safar_go',
      question: 'What are the baggage size and packing regulations for Gulf flights?',
      answer: 'Most Gulf airlines (Emirates, Air India Express, Saudia, Qatar Airways) require checked baggage to adhere to standard dimensions. We supply airline-approved double-walled 70x50x40 cm carton boxes, digital hanging luggage scales, and waterproof cross-strapping so your baggage is never rejected or fined for overweight.',
      tags: ['baggage', 'boxes', 'weight', 'scales'],
    },
    {
      id: 'go_faq_3',
      category: 'safar_go',
      question: 'Can I carry prescription medicines when traveling to the Gulf?',
      answer: 'Yes, up to a maximum 3-month personal supply. You must carry the original physician prescription, doctor registration number, and pharmacy invoice. Certain narcotic/psychotropic drugs require prior online approval (e.g. UAE MOHAP/SFDA). We review your medicine list prior to travel for complete compliance.',
      tags: ['medicines', 'customs', 'prescription', 'health'],
    },
    {
      id: 'go_faq_4',
      category: 'safar_go',
      question: 'How does Safar Go assist with flights and airport transit?',
      answer: 'We coordinate end-to-end flight booking with optimal baggage allowances, provide terminal transit navigation maps, assist with web check-in, and guide you through immigration and customs procedures upon arrival.',
      tags: ['flights', 'tickets', 'transit', 'airport'],
    },
  ],
  safar_home: [
    {
      id: 'home_faq_1',
      category: 'safar_home',
      question: 'How does Safar Home assist elderly parents with doctor appointments and medical care?',
      answer: 'Our verified care coordinators schedule appointments with leading specialists, organize reliable doorstep pickup, accompany your parents inside the doctor consultation, take care of lab tests, and immediately send you a detailed consultation summary and prescription via WhatsApp.',
      tags: ['medical', 'parents', 'doctor', 'elderly'],
    },
    {
      id: 'home_faq_2',
      category: 'safar_home',
      question: 'Can you arrange monthly delivery of prescription medicines to my family in India?',
      answer: 'Yes. We partner with licensed, certified pharmacies to fulfill monthly chronic medication refills, verify expiry dates, and deliver them right to your parents doorstep with automated monthly replenishment reminders.',
      tags: ['medicines', 'pharmacy', 'delivery', 'parents'],
    },
    {
      id: 'home_faq_3',
      category: 'safar_home',
      question: 'What emergency local support is available for my family while I am in the Gulf?',
      answer: 'We provide a 24/7 dedicated helpline for on-ground emergencies. In case of illness or accident, our local team arranges rapid ambulance dispatch, assists with hospital admission formalities, and keeps you updated in real time via WhatsApp.',
      tags: ['emergency', 'hospital', '24/7', 'support'],
    },
    {
      id: 'home_faq_4',
      category: 'safar_home',
      question: 'How do you coordinate home maintenance, AC repair, and plumbing in India?',
      answer: 'We dispatch vetted and background-checked technicians (electricians, plumbers, AC service personnel). We supervise the work, provide upfront transparent cost approvals, and send you video/photo verification upon completion.',
      tags: ['maintenance', 'repairs', 'ac', 'plumbing'],
    },
  ],
};

/**
 * Keyword sets with weights for categorization heuristics
 */
interface KeywordRule {
  term: string;
  weight: number;
}

const SAFAR_GO_KEYWORDS: KeywordRule[] = [
  // High confidence pillar terms
  { term: 'safar go', weight: 10 },
  { term: 'safargo', weight: 10 },
  { term: 'safar-go', weight: 10 },
  { term: 'gulf travel', weight: 8 },
  { term: 'gulf packing', weight: 8 },
  
  // Gulf destinations
  { term: 'gulf', weight: 4 },
  { term: 'dubai', weight: 5 },
  { term: 'uae', weight: 5 },
  { term: 'saudi', weight: 5 },
  { term: 'riyadh', weight: 4 },
  { term: 'jeddah', weight: 4 },
  { term: 'dammam', weight: 4 },
  { term: 'qatar', weight: 4 },
  { term: 'doha', weight: 4 },
  { term: 'kuwait', weight: 4 },
  { term: 'oman', weight: 4 },
  { term: 'muscat', weight: 4 },
  { term: 'bahrain', weight: 4 },
  { term: 'gcc', weight: 4 },
  { term: 'abroad', weight: 3 },
  
  // Travel & flight mechanics
  { term: 'travel', weight: 3 },
  { term: 'travelling', weight: 3 },
  { term: 'flight', weight: 4 },
  { term: 'ticket', weight: 4 },
  { term: 'booking', weight: 3 },
  { term: 'visa', weight: 4 },
  { term: 'transit', weight: 4 },
  { term: 'relocation', weight: 3 },
  { term: 'airport', weight: 3 },
  { term: 'airline', weight: 3 },
  
  // Packing & baggage rules
  { term: 'packing', weight: 5 },
  { term: 'baggage', weight: 5 },
  { term: 'luggage', weight: 4 },
  { term: 'carton', weight: 4 },
  { term: 'box', weight: 3 },
  { term: 'boxes', weight: 3 },
  { term: 'scale', weight: 3 },
  { term: 'scales', weight: 3 },
  { term: 'weight', weight: 3 },
  { term: 'duffel', weight: 3 },
  { term: 'prohibited', weight: 4 },
  { term: 'allowed', weight: 3 },
  { term: 'customs', weight: 4 },
  { term: 'spices', weight: 4 },
  { term: 'spice', weight: 3 },
  { term: 'masala', weight: 3 },
  { term: 'food packing', weight: 5 },
  { term: 'khus khus', weight: 5 },
  { term: 'pickle', weight: 3 },
];

const SAFAR_HOME_KEYWORDS: KeywordRule[] = [
  // High confidence pillar terms
  { term: 'safar home', weight: 10 },
  { term: 'safarhome', weight: 10 },
  { term: 'safar-home', weight: 10 },
  { term: 'family care', weight: 8 },
  { term: 'parent care', weight: 8 },
  { term: 'elderly care', weight: 8 },
  
  // Family & Parents
  { term: 'home', weight: 3 },
  { term: 'family', weight: 4 },
  { term: 'parent', weight: 5 },
  { term: 'parents', weight: 5 },
  { term: 'elderly', weight: 5 },
  { term: 'mother', weight: 4 },
  { term: 'father', weight: 4 },
  { term: 'mom', weight: 4 },
  { term: 'dad', weight: 4 },
  { term: 'senior', weight: 4 },
  { term: 'aged', weight: 3 },
  { term: 'nri', weight: 3 },
  
  // Medical & Health
  { term: 'medical', weight: 5 },
  { term: 'doctor', weight: 5 },
  { term: 'hospital', weight: 5 },
  { term: 'medicine', weight: 4 },
  { term: 'medicines', weight: 4 },
  { term: 'prescription', weight: 4 },
  { term: 'clinic', weight: 4 },
  { term: 'checkup', weight: 4 },
  { term: 'health', weight: 3 },
  { term: 'appointment', weight: 4 },
  { term: 'ambulance', weight: 4 },
  { term: 'vitals', weight: 4 },
  { term: 'emergency', weight: 4 },
  
  // Errands & Home support
  { term: 'care', weight: 3 },
  { term: 'grocery', weight: 4 },
  { term: 'groceries', weight: 4 },
  { term: 'maintenance', weight: 5 },
  { term: 'repair', weight: 5 },
  { term: 'repairs', weight: 5 },
  { term: 'plumbing', weight: 4 },
  { term: 'plumber', weight: 4 },
  { term: 'electrician', weight: 4 },
  { term: 'ac repair', weight: 5 },
  { term: 'ac servicing', weight: 5 },
  { term: 'bill', weight: 3 },
  { term: 'bills', weight: 3 },
  { term: 'errand', weight: 3 },
  { term: 'errands', weight: 3 },
  { term: 'remittance', weight: 3 },
];

/**
 * Categorize service interest into 'safar_go' vs 'safar_home'.
 * Uses case-insensitive keyword matching and weighted semantic heuristics.
 * Falls back to 'safar_go' if ambiguous, empty, or unclassified.
 */
export function categorizeServiceInterest(serviceInterest?: string | null): CategorizationResult {
  if (!serviceInterest || typeof serviceInterest !== 'string' || !serviceInterest.trim()) {
    return {
      category: 'safar_go',
      confidence: 0.5,
      matchedKeywords: [],
      reasoning: 'Default fallback to safar_go: no service interest specified.',
    };
  }

  const normalized = serviceInterest.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  let goScore = 0;
  for (const rule of SAFAR_GO_KEYWORDS) {
    if (normalized.includes(rule.term)) {
      goScore += rule.weight;
      matchedKeywords.push(`go:${rule.term}`);
    }
  }

  let homeScore = 0;
  for (const rule of SAFAR_HOME_KEYWORDS) {
    if (normalized.includes(rule.term)) {
      homeScore += rule.weight;
      matchedKeywords.push(`home:${rule.term}`);
    }
  }

  // Determine category based on weighted scores
  if (homeScore > goScore) {
    const total = homeScore + goScore;
    const confidence = total > 0 ? Number((homeScore / total).toFixed(2)) : 0.75;
    return {
      category: 'safar_home',
      confidence: Math.max(0.6, confidence),
      matchedKeywords,
      reasoning: `Categorized as safar_home (homeScore: ${homeScore}, goScore: ${goScore}).`,
    };
  }

  if (goScore > 0) {
    const total = homeScore + goScore;
    const confidence = total > 0 ? Number((goScore / total).toFixed(2)) : 0.75;
    return {
      category: 'safar_go',
      confidence: Math.max(0.6, confidence),
      matchedKeywords,
      reasoning: `Categorized as safar_go (goScore: ${goScore}, homeScore: ${homeScore}).`,
    };
  }

  // Ambiguous input — default fallback to safar_go
  return {
    category: 'safar_go',
    confidence: 0.5,
    matchedKeywords: [],
    reasoning: 'Default fallback to safar_go: ambiguous service interest keyword match.',
  };
}

/**
 * Retrieve curated FAQ items for a specific SAFAR category
 */
export function getFaqsForCategory(category: SafarCategory): FAQItem[] {
  return SAFAR_FAQS[category] ?? SAFAR_FAQS.safar_go;
}

/**
 * Generate intelligent, trustworthy, and simple response preview message
 * tailored to the visitor's categorized service interest.
 */
export function generateFaqPreview(
  name: string,
  category: SafarCategory,
  serviceInterest?: string | null
): string {
  const cleanName = name?.trim() || 'Valued Traveler';
  const interestText = serviceInterest?.trim() ? ` regarding "${serviceInterest.trim()}"` : '';

  if (category === 'safar_home') {
    return (
      `Assalamu Alaikum ${cleanName}! Welcome to SAFAR N MANZIL (Safar Home). ` +
      `While you are working hard in the Gulf, our dedicated ground team in India takes complete care of your family. ` +
      `We have received your inquiry${interestText} and are ready to assist with elderly parent check-ins, ` +
      `doctor appointments, monthly medicine delivery, emergency local support, or home repairs. ` +
      `A family care coordinator will connect with you on WhatsApp shortly to assist.`
    );
  }

  return (
    `Assalamu Alaikum ${cleanName}! Welcome to SAFAR N MANZIL (Safar Go). ` +
    `We provide seamless Gulf travel and packing assistance from India. ` +
    `We have received your inquiry${interestText} and can assist with flight bookings, ` +
    `approved carton packing, baggage weight limits, prohibited food/spice rules, and GCC customs guidance. ` +
    `Our travel specialist will connect with you on WhatsApp shortly to assist.`
  );
}

/**
 * Generate complete Agent Knowledge response packet for lead ingestion
 */
export function generateWelcomeMessage(
  name: string,
  category: SafarCategory,
  serviceInterest?: string | null
): AgentKnowledgeResponse {
  const cleanName = name?.trim() || 'Valued Guest';
  const faqs = getFaqsForCategory(category);
  const previewText = generateFaqPreview(cleanName, category, serviceInterest);

  const greeting =
    category === 'safar_home'
      ? `Assalamu Alaikum ${cleanName}, welcome to Safar Home. Your family's peace of mind is our utmost priority.`
      : `Assalamu Alaikum ${cleanName}, welcome to Safar Go. Your smooth journey to the Gulf starts here.`;

  const summary =
    category === 'safar_home'
      ? 'NRI family assistance: elderly care, medical coordination, doorstep medicine delivery, emergency local support, and home maintenance.'
      : 'Gulf travel assistance: flight bookings, baggage weight & box packing guidelines, GCC customs compliance, and transit support.';

  return {
    category,
    greeting,
    summary,
    faqs,
    previewText,
  };
}
