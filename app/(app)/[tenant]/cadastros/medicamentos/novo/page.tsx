import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MedicamentoForm } from '../medicamentos-form'

export default async function NovoMedicamentoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/medicamentos`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para medicamentos
        </Link>
        <h1 className="text-2xl font-bold">Novo medicamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Nome é obrigatório.</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <MedicamentoForm tenantSlug={tenantSlug} />
      </div>
    </div>
  )
}
