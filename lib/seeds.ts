import { prisma } from './prisma'

// ─── Templates (données de base) ─────────────────────────────────

export interface ChecklistTemplateItem {
  stepNumber: number
  title: string
  subtasks: string[]
}

// 7 étapes de la checklist stratégie — instanciées à la connexion d'une chaîne.
export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
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

export interface KnowledgeSeed {
  category: string
  title: string
  content: string
  source: string
  scope: 'global' | 'en' | 'ar' // en/ar = spécifique à une langue de chaîne
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

// Appelé à la connexion d'une chaîne : crée les 7 étapes de checklist.
export async function instantiateChecklist(channelId: string) {
  const existing = await prisma.checklistStep.count({ where: { channelId } })
  if (existing > 0) return 0

  let created = 0
  for (const step of CHECKLIST_TEMPLATE) {
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
