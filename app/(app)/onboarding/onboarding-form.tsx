'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { slugify } from '@/lib/utils'
import { createTenant } from './actions'
import { MessageCircle } from 'lucide-react'

const WA_SUPORTE = 'https://wa.me/5515997612670?text=' +
  encodeURIComponent('Olá! Acabei de criar minha conta no Tecbov e preciso ser adicionado a uma fazenda.')

const POSITIONS = [
  { value: 'proprietario', label: 'Proprietário' },
  { value: 'funcionario',  label: 'Funcionário'  },
  { value: 'consultor',    label: 'Consultor'    },
  { value: 'contador',     label: 'Contador'     },
  { value: 'estudante',    label: 'Estudante'    },
]

const COMPANY_SIZES = [
  { value: '1-5',    label: '1 a 5 funcionários'    },
  { value: '6-10',   label: '6 a 10 funcionários'   },
  { value: '10-30',  label: '10 a 30 funcionários'  },
  { value: '30-50',  label: '30 a 50 funcionários'  },
  { value: '50-100', label: '50 a 100 funcionários' },
  { value: '100+',   label: 'Mais de 100 funcionários' },
]

export function OnboardingForm({ userId, userEmail, preview }: { userId: string; userEmail?: string; preview?: boolean }) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slug = slugify(companyName)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await createTenant(new FormData(e.currentTarget))
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex rounded-lg border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-2 font-medium transition-colors ${
            mode === 'create' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Criar fazenda
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`flex-1 py-2 font-medium transition-colors ${
            mode === 'join' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Entrar em fazenda
        </button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fazenda */}
          <div className="space-y-1.5">
            <Label htmlFor="company">Nome da fazenda</Label>
            <Input
              id="company"
              name="companyName"
              placeholder="Ex: Minha Fazenda Ltda"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              minLength={2}
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Identificador: <span className="font-mono">{slug}</span>
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              placeholder="(15) 99999-9999"
            />
          </div>

          {/* Posição e tamanho em grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="position">Sua posição</Label>
              <select
                id="position"
                name="position"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {POSITIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companySize">Tamanho da fazenda</Label>
              <select
                id="companySize"
                name="companySize"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {COMPANY_SIZES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || !companyName.trim()}>
            {loading ? 'Criando fazenda...' : 'Criar fazenda e começar teste grátis'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Para ser adicionado a uma fazenda existente, envie seu e-mail ao administrador Tecbov:
            </p>
            <p className="font-mono text-sm font-semibold bg-background border rounded-md px-3 py-2">
              {userEmail ?? userId}
            </p>
            <p className="text-xs text-muted-foreground">
              Após ser adicionado, atualize a página para acessar a fazenda.
            </p>
          </div>
          <Button asChild className="w-full gap-2">
            <a href={WA_SUPORTE} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              Falar com suporte no WhatsApp
            </a>
          </Button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Já fui adicionado — atualizar
          </button>
        </div>
      )}
    </div>
  )
}
