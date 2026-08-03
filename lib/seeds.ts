import { prisma } from './prisma'

// ─── Templates (données de base) ─────────────────────────────────

export interface ChecklistTemplateItem {
  stepNumber: number
  title: string
  subtasks: string[]
}

// Template YouTube (7 étapes — strategy classique YPP).
// Instanciées à la connexion d'une chaîne YouTube.
export const CHECKLIST_TEMPLATE_YOUTUBE: ChecklistTemplateItem[] = [
  {
    stepNumber: 1,
    title: 'Nom de chaîne',
    subtasks: [
      'Court et facile à prononcer',
      'Langue cible (EN ou AR)',
      'Disponible sur les autres plateformes',
      'Orienté "IA business/automatisation" (EN) ou finance islamique/business (AR)',
    ],
  },
  {
    stepNumber: 2,
    title: 'Setup technique',
    subtasks: [
      'Langue du compte définie',
      'Bannière + logo',
      'Description SEO',
      'AdSense lié',
      '2FA activée',
    ],
  },
  {
    stepNumber: 3,
    title: 'Contenu pilier (5 piliers)',
    subtasks: [
      'Automatisation',
      'Business',
      'Outils',
      'Études de cas',
      'Erreurs à éviter',
    ],
  },
  {
    stepNumber: 4,
    title: 'SEO ciblage géographique',
    subtasks: [
      'Mots-clés adaptés à la langue/cible de cette chaîne',
      'Sous-titres si pertinent',
      'Vérification hebdomadaire de la géographie',
    ],
  },
  {
    stepNumber: 5,
    title: 'Format et croissance',
    subtasks: [
      'Ratio ~1 Short pour 2-3 vidéos longues',
      'Format long 10-15 min',
      'Règle 80/20 evergreen/actualité',
      'Objectif 1500-2000h au mois 6',
    ],
  },
  {
    stepNumber: 6,
    title: 'Monétisation',
    subtasks: [
      'Prérequis YPP atteints',
      'Compte d\'au moins 30 jours',
      'Aucune sanction',
    ],
  },
  {
    stepNumber: 7,
    title: 'Diversification',
    subtasks: [
      'AdSense',
      'Affiliation',
      'Sponsoring dès 5-10K abonnés',
      'Produits numériques',
      'Vente de services propres (agents IA, sites, CRM, conseil)',
    ],
  },
]

// Template TikTok (Module 8) — 7 étapes réordonnées selon les VRAIS seuils d'atteinte :
// Shop Affiliate (1000-5000 abonnés, court terme) avant Creator Rewards (10K + 100K vues/30j, moyen terme).
export const CHECKLIST_TEMPLATE_TIKTOK: ChecklistTemplateItem[] = [
  {
    stepNumber: 1,
    title: 'Setup du compte',
    subtasks: [
      'Compte personnel (PAS business) — l\'algorithme favorise les comptes perso',
      'Bio optimisée : niche + promesse + CTA',
      'Photo de profil + nom d\'utilisateur cohérent avec la niche',
      'Lien TikTok Shop / réseaux en bio si pertinent',
    ],
  },
  {
    stepNumber: 2,
    title: 'Format des vidéos',
    subtasks: [
      'Présence humaine réelle (voix authentique ou visage) — le 100% IA est pénalisé en 2026',
      'Durée 60-180 secondes (le format favorisé)',
      'Sous-titres systématiques',
      'Hook dans la 1ère seconde',
    ],
  },
  {
    stepNumber: 3,
    title: 'Cohérence de niche',
    subtasks: [
      'Rester STRICTEMENT dans IA business/automatisation',
      'Dévier de la niche = ~45% de portée en moins',
      'Chaque vidéo doit déboucher sur un gain business concret',
    ],
  },
  {
    stepNumber: 4,
    title: 'Cadence de publication',
    subtasks: [
      '3-5 vidéos de QUALITÉ par semaine',
      'Pas de sur-publication quotidienne faible',
      'Plan de contenu hebdomadaire (réutilisable)',
    ],
  },
  {
    stepNumber: 5,
    title: 'SEO TikTok',
    subtasks: [
      '3-5 hashtags pertinents MAX — jamais #fyp/#foryou',
      'Mots-clés dans la légende (recherche TikTok)',
      'Titre texte à l\'écran + couverture accrocheuse',
    ],
  },
  {
    stepNumber: 6,
    title: 'TikTok Shop Affiliate (objectif court terme)',
    subtasks: [
      'Seuil d\'accès : 1000-5000 abonnés',
      'Atteignable AVANT le Creator Rewards Program',
      'Commissions sur produits affiliés',
    ],
  },
  {
    stepNumber: 7,
    title: 'Creator Rewards Program + repurposing (objectif moyen terme)',
    subtasks: [
      'Seuil : 10 000 abonnés + 100K vues / 30 jours',
      'Activer le programme une fois le seuil atteint',
      'Repurposing cross-plateforme : chaque idée TikTok → version YouTube Shorts',
    ],
  },
]

export interface KnowledgeSeed {
  category: string
  title: string
  content: string
  source: string
  // scope : 'global' = instancié au 1er login ; 'en'/'ar' = langue de chaîne (YouTube) ;
  // 'tiktok' = spécifique à une chaîne TikTok (instancié à sa création).
  scope: 'global' | 'en' | 'ar' | 'tiktok'
}

// Seeds initiaux de la base de connaissances (instanciés au premier login).
export const KNOWLEDGE_SEEDS: KnowledgeSeed[] = [
  {
    category: 'positionnement',
    title: 'Positionnement global',
    content: 'Viser "IA pour automatiser un business", pas "actu IA". Chaque vidéo doit déboucher sur un gain business concret pour le spectateur.',
    source: 'seed',
    scope: 'global',
  },
  {
    category: 'format',
    title: 'Format des vidéos',
    content: 'Ratio 1 Short pour 2-3 vidéos longues. Format long de 10-15 minutes. Les longs formats portent la rétention, les Shorts portent la découverte.',
    source: 'seed',
    scope: 'global',
  },
  {
    category: 'monétisation',
    title: 'Monétisation au-delà de la pub',
    content: 'Vendre des services propres en plus des revenus publicitaires : agents IA, sites, CRM, conseil. C\'est le levier de revenu principal.',
    source: 'seed',
    scope: 'global',
  },
  {
    category: 'pays-ciblage',
    title: 'Pays cibles — chaîne EN',
    content: 'Tier 1 = US/UK/CA/AU/NZ. Tier 2 = DE/FR/NL/SE/NO/CH. Le RPM des pays Tier 1 est 3-5x supérieur.',
    source: 'seed',
    scope: 'en',
  },
  {
    category: 'pays-ciblage',
    title: 'Pays cibles — chaîne AR',
    content: 'Golfe (SA/AE/QA/OM/KW) + diaspora arabe US/UK. La diaspora a le plus fort pouvoir d\'achat et le RPM le plus élevé pour du contenu arabe.',
    source: 'seed',
    scope: 'ar',
  },
  {
    category: 'contenu',
    title: 'Règle 80/20 evergreen/actualité',
    content: '80% de contenu evergreen (recherche stable, repères de long terme), 20% d\'actualité (boost de découverte à court terme).',
    source: 'seed',
    scope: 'global',
  },
]

// Règles spécifiques TikTok (Module 8) — catégorie 'tiktok', instanciées liées à CHAQUE chaîne
// TikTok à sa création (le mentor ne charge que les règles de la chaîne active).
export const KNOWLEDGE_SEEDS_TIKTOK: KnowledgeSeed[] = [
  {
    category: 'tiktok',
    title: 'Présence humaine réelle',
    content: 'Voix authentique ou visage obligatoire : le contenu 100% généré par IA est pénalisé par l\'algorithme TikTok en 2026.',
    source: 'seed',
    scope: 'tiktok',
  },
  {
    category: 'tiktok',
    title: 'Format favorisé',
    content: 'Durée 60-180 secondes, sous-titres systématiques, hook dans la 1ère seconde.',
    source: 'seed',
    scope: 'tiktok',
  },
  {
    category: 'tiktok',
    title: 'Cadence de publication',
    content: '3-5 vidéos de qualité par semaine. Pas de sur-publication quotidienne faible.',
    source: 'seed',
    scope: 'tiktok',
  },
  {
    category: 'tiktok',
    title: 'Strictement dans la niche',
    content: 'Rester strictement dans la niche IA business/automatisation — dévier = ~45% de portée en moins.',
    source: 'seed',
    scope: 'tiktok',
  },
  {
    category: 'tiktok',
    title: 'Hashtags',
    content: '3-5 hashtags pertinents max, jamais #fyp/#foryou. Mots-clés dans la légende.',
    source: 'seed',
    scope: 'tiktok',
  },
  {
    category: 'tiktok',
    title: 'Repurposing cross-plateforme',
    content: 'Chaque idée TikTok peut être adaptée en version YouTube Shorts (repurposing) pour cumuler les deux audiences.',
    source: 'seed',
    scope: 'tiktok',
  },
]

// ─── Helpers d'instanciation ────────────────────────────────────

// Appelé au premier login : installe UNIQUEMENT les connaissances globales (scope === 'global').
// Les seeds spécifiques à une langue (scope en/ar) sont instanciées à la connexion de la chaîne
// correspondante via ensureLanguageKnowledge (voir callback OAuth).
export async function ensureKnowledgeSeeds(userId: string) {
  const existing = await prisma.knowledgeEntry.count({ where: { userId, channelId: null } })
  if (existing > 0) return 0

  let created = 0
  for (const seed of KNOWLEDGE_SEEDS.filter((s) => s.scope === 'global')) {
    await prisma.knowledgeEntry.create({
      data: {
        userId,
        category: seed.category,
        title: seed.title,
        content: seed.content,
        source: seed.source,
      },
    })
    created++
  }
  return created
}

// Appelé à la connexion d'une chaîne : instancie les seeds de la langue de la chaîne,
// liées à CETTE chaîne (le mentor ne charge que les règles de la chaîne active).
export async function ensureLanguageKnowledge(
  userId: string,
  channelId: string,
  language: 'en' | 'ar',
) {
  let created = 0
  for (const seed of KNOWLEDGE_SEEDS.filter((s) => s.scope === language)) {
    const exists = await prisma.knowledgeEntry.findFirst({
      where: { userId, channelId, title: seed.title },
    })
    if (!exists) {
      await prisma.knowledgeEntry.create({
        data: {
          userId,
          channelId,
          category: seed.category,
          title: seed.title,
          content: seed.content,
          source: seed.source,
        },
      })
      created++
    }
  }
  return created
}

// Appelé à la création d'une chaîne TikTok : instancie les règles spécifiques TikTok
// (catégorie 'tiktok'), liées à CETTE chaîne.
export async function ensurePlatformKnowledge(
  userId: string,
  channelId: string,
  platform: 'youtube' | 'tiktok',
) {
  if (platform !== 'tiktok') return 0
  let created = 0
  for (const seed of KNOWLEDGE_SEEDS_TIKTOK) {
    const exists = await prisma.knowledgeEntry.findFirst({
      where: { userId, channelId, title: seed.title },
    })
    if (!exists) {
      await prisma.knowledgeEntry.create({
        data: {
          userId,
          channelId,
          category: seed.category,
          title: seed.title,
          content: seed.content,
          source: seed.source,
        },
      })
      created++
    }
  }
  return created
}

// Appelé à la création/connexion d'une chaîne : crée les 7 étapes de checklist
// du template correspondant à la plateforme.
export async function instantiateChecklist(channelId: string, platform: 'youtube' | 'tiktok' = 'youtube') {
  const existing = await prisma.checklistStep.count({ where: { channelId } })
  if (existing > 0) return 0

  const template = platform === 'tiktok' ? CHECKLIST_TEMPLATE_TIKTOK : CHECKLIST_TEMPLATE_YOUTUBE
  let created = 0
  for (const step of template) {
    await prisma.checklistStep.create({
      data: {
        channelId,
        stepNumber: step.stepNumber,
        title: step.title,
        subtasks: step.subtasks,
      },
    })
    created++
  }
  return created
}
