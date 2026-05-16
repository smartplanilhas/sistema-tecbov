import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SemenForm } from '../semen-form'

export default async function NovoSemenPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/cadastros/semen`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para sêmen
        </Link>
        <h1 className="text-2xl font-bold">Novo sêmen</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do touro. Nome é obrigatório.</p>
      </div>
      <SemenForm tenantSlug={tenantSlug} />
    </div>
  )
}
