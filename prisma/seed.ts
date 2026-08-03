import { ensureKnowledgeSeeds } from '../lib/seeds'

// Seed script : instancie les connaissances globales pour un user donné.
// Usage : npm run db:seed -- <userId>
// (Les seeds sont normalement instanciés automatiquement au premier login via NextAuth.)

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.log('Usage: npm run db:seed -- <userId>')
    console.log('Les seeds sont aussi instanciés automatiquement au premier login.')
    return
  }
  const created = await ensureKnowledgeSeeds(userId)
  console.log(`✓ ${created} entrées de connaissances seedées pour l\'utilisateur ${userId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
