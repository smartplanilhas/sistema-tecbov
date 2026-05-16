import { ReportsView } from './reports-view'

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  return <ReportsView tenantSlug={tenantSlug} />
}
