'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Person } from '@/types/database'

type Tab = 'dados' | 'endereco' | 'adicionais'

const tabs: { id: Tab; label: string }[] = [
  { id: 'dados', label: 'Dados' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'adicionais', label: 'Informações Adicionais' },
]

type FormState = {
  isClient: boolean
  isSupplier: boolean
  active: boolean
  name: string
  document: string
  tradeName: string
  contactName: string
  phone: string
  email: string
  zipCode: string
  state: string
  city: string
  address: string
  addressNumber: string
  complement: string
  neighborhood: string
  stateRegistration: string
  municipalRegistration: string
  birthDate: string
  notes: string
}

const emptyForm: FormState = {
  isClient: false,
  isSupplier: false,
  active: true,
  name: '',
  document: '',
  tradeName: '',
  contactName: '',
  phone: '',
  email: '',
  zipCode: '',
  state: '',
  city: '',
  address: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  stateRegistration: '',
  municipalRegistration: '',
  birthDate: '',
  notes: '',
}

function personToForm(p: Person): FormState {
  return {
    isClient: p.is_client,
    isSupplier: p.is_supplier,
    active: p.active,
    name: p.name,
    document: p.document ?? '',
    tradeName: p.trade_name ?? '',
    contactName: p.contact_name ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    zipCode: p.zip_code ?? '',
    state: p.state ?? '',
    city: p.city ?? '',
    address: p.address ?? '',
    addressNumber: p.address_number ?? '',
    complement: p.complement ?? '',
    neighborhood: p.neighborhood ?? '',
    stateRegistration: p.state_registration ?? '',
    municipalRegistration: p.municipal_registration ?? '',
    birthDate: p.birth_date ?? '',
    notes: p.notes ?? '',
  }
}

export function PersonDialog({
  tenantId,
  person,
  open,
  onOpenChange,
}: {
  tenantId: string
  person?: Person | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const isEdit = !!person
  const [activeTab, setActiveTab] = useState<Tab>('dados')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setForm(person ? personToForm(person) : emptyForm)
      setActiveTab('dados')
      setError('')
      setLoading(false)
    }
  }, [open, person])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCepBlur() {
    const digits = form.zipCode.replace(/\D/g, '')
    if (digits.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          state: data.uf ?? prev.state,
          city: data.localidade ?? prev.city,
          address: data.logradouro ?? prev.address,
          neighborhood: data.bairro ?? prev.neighborhood,
        }))
      }
    } catch {
      // ignore network errors
    }
    setLoadingCep(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.isClient && !form.isSupplier) {
      setError('Selecione pelo menos um tipo: Cliente ou Fornecedor.')
      return
    }
    if (!form.name.trim()) {
      setError('Nome / Razão Social é obrigatório.')
      setActiveTab('dados')
      return
    }
    setError('')
    setLoading(true)

    const payload = {
      tenant_id: tenantId,
      is_client: form.isClient,
      is_supplier: form.isSupplier,
      active: form.active,
      name: form.name.trim(),
      document: form.document || null,
      trade_name: form.tradeName || null,
      contact_name: form.contactName || null,
      phone: form.phone || null,
      email: form.email || null,
      zip_code: form.zipCode || null,
      state: form.state || null,
      city: form.city || null,
      address: form.address || null,
      address_number: form.addressNumber || null,
      complement: form.complement || null,
      neighborhood: form.neighborhood || null,
      state_registration: form.stateRegistration || null,
      municipal_registration: form.municipalRegistration || null,
      birth_date: form.birthDate || null,
      notes: form.notes || null,
    }

    let queryError
    if (isEdit) {
      const { error } = await supabase.from('people').update(payload).eq('id', person!.id)
      queryError = error
    } else {
      const { error } = await supabase.from('people').insert(payload)
      queryError = error
    }

    if (queryError) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 pb-0">
          <DialogTitle>{isEdit ? 'Editar pessoa' : 'Nova pessoa'}</DialogTitle>

          {/* Tipo + Status — sempre visíveis */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isClient}
                  onChange={(e) => set('isClient', e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm font-medium">Cliente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isSupplier}
                  onChange={(e) => set('isSupplier', e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm font-medium">Fornecedor</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => set('active', !form.active)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  form.active ? 'bg-green-500' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  form.active ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
              <span className={`text-sm font-medium ${form.active ? 'text-green-700' : 'text-muted-foreground'}`}>
                {form.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b shrink-0 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 py-4 space-y-4">

            {/* Tab: Dados */}
            {activeTab === 'dados' && (
              <>
                <div className="space-y-1.5">
                  <Label>Nome / Razão Social *</Label>
                  <Input
                    placeholder="Nome completo ou razão social"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={form.document}
                      onChange={(e) => set('document', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome Fantasia</Label>
                    <Input
                      placeholder="Nome fantasia"
                      value={form.tradeName}
                      onChange={(e) => set('tradeName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome do Contato</Label>
                    <Input
                      placeholder="Responsável / contato"
                      value={form.contactName}
                      onChange={(e) => set('contactName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Tab: Endereço */}
            {activeTab === 'endereco' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>CEP</Label>
                    <Input
                      placeholder="00000-000"
                      value={form.zipCode}
                      onChange={(e) => set('zipCode', e.target.value)}
                      onBlur={handleCepBlur}
                      disabled={loadingCep}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Input
                      placeholder="SP"
                      value={form.state}
                      onChange={(e) => set('state', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="São Paulo"
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input
                      placeholder="Centro"
                      value={form.neighborhood}
                      onChange={(e) => set('neighborhood', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Rua, Avenida..."
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Número</Label>
                    <Input
                      placeholder="123"
                      value={form.addressNumber}
                      onChange={(e) => set('addressNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Complemento</Label>
                    <Input
                      placeholder="Apto, Sala..."
                      value={form.complement}
                      onChange={(e) => set('complement', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Tab: Informações Adicionais */}
            {activeTab === 'adicionais' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Inscrição Estadual</Label>
                    <Input
                      placeholder="IE"
                      value={form.stateRegistration}
                      onChange={(e) => set('stateRegistration', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inscrição Municipal</Label>
                    <Input
                      placeholder="IM"
                      value={form.municipalRegistration}
                      onChange={(e) => set('municipalRegistration', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set('birthDate', e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação</Label>
                  <textarea
                    placeholder="Observações gerais..."
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive shrink-0 pb-2">{error}</p>
          )}

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
