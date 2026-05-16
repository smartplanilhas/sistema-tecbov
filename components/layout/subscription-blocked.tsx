import { AlertTriangle, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Status = 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'

const messages: Record<Status, { title: string; description: string }> = {
  trial: {
    title: 'Período de teste encerrado',
    description: 'Seus 7 dias de teste gratuito chegaram ao fim. Escolha um plano para continuar usando o Tecbov.',
  },
  past_due: {
    title: 'Pagamento pendente',
    description: 'Identificamos um problema com o pagamento da sua assinatura. Entre em contato para regularizar.',
  },
  blocked: {
    title: 'Acesso suspenso',
    description: 'O acesso à sua conta foi suspenso. Entre em contato com o suporte para reativar.',
  },
  cancelled: {
    title: 'Assinatura cancelada',
    description: 'Sua assinatura foi cancelada. Para reativar, escolha um plano e entre em contato.',
  },
  active: {
    title: 'Assinatura expirada',
    description: 'O período da sua assinatura encerrou. Renove para continuar com acesso completo.',
  },
}

export function SubscriptionBlocked({
  status,
  tenantName,
  trialEndsAt,
}: {
  status: Status
  tenantName: string
  trialEndsAt?: string | null
}) {
  const msg = messages[status] ?? messages.blocked

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-4">
            <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{tenantName}</p>
          <h1 className="text-2xl font-bold">{msg.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{msg.description}</p>
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-3 text-sm text-left">
          <p className="font-medium">Entre em contato para reativar:</p>
          <Link
            href="mailto:contato@tecbov.com.br"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0" />
            contato@tecbov.com.br
          </Link>
          <Link
            href="https://wa.me/5500000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            WhatsApp — seg a sáb, 10h–19h
          </Link>
        </div>

        <Button asChild className="w-full">
          <Link href="mailto:contato@tecbov.com.br">
            Fale conosco para reativar
          </Link>
        </Button>
      </div>
    </div>
  )
}
