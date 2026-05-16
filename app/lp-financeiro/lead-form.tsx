'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LeadFormProps {
  cta: string
  plan?: string
  compact?: boolean
}

export function LeadForm({ cta, plan, compact = false }: LeadFormProps) {
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan }),
      })
      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <p className="text-green-400 font-semibold">Recebemos seu interesse!</p>
        <p className="text-slate-400 text-sm mt-1">Em breve entraremos em contato.</p>
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="seu@email.com"
          required
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-green-500/50"
        />
        <Button
          type="submit"
          disabled={loading}
          className="bg-green-500 hover:bg-green-400 text-black font-bold shrink-0 cursor-pointer"
        >
          {loading ? '...' : 'Entrar'}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="text"
        placeholder="Seu nome"
        required
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-12 focus-visible:ring-green-500/50"
      />
      <Input
        type="email"
        placeholder="Seu e-mail"
        required
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-12 focus-visible:ring-green-500/50"
      />
      <Input
        type="tel"
        placeholder="WhatsApp (com DDD)"
        value={form.whatsapp}
        onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
        className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-12 focus-visible:ring-green-500/50"
      />
      <Button
        type="submit"
        disabled={loading}
        className="bg-green-500 hover:bg-green-400 text-black font-bold h-12 text-base cursor-pointer"
      >
        {loading ? 'Enviando...' : cta}
      </Button>
    </form>
  )
}
