import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const POSITION_LABEL: Record<string, string> = {
  proprietario:     'Proprietário',
  funcionario:      'Funcionário',
  gestor:           'Gestor',
  tecnico_consultor:'Técnico/Consultor',
  contador:         'Contador',
  estudante:        'Estudante',
  outro:            'Outro',
}

const SOURCE_LABEL: Record<string, string> = {
  indicacao: 'Indicação',
  google:    'Google',
  instagram: 'Instagram',
  tiktok:    'Tiktok',
  facebook:  'Facebook',
  youtube:   'Youtube',
}

const CONTROL_LABEL: Record<string, string> = {
  caderno:  'Caderno',
  planilha: 'Planilha',
  sistema:  'Sistema/App',
  nenhum:   'Não controla',
}

const START_LABEL: Record<string, string> = {
  passo_a_passo: 'Passo a Passo',
  suporte:       'Suporte',
  explorar:      'Explorar',
}

const START_VARIANT: Record<string, 'success' | 'secondary' | 'warning'> = {
  passo_a_passo: 'success',
  suporte:       'warning',
  explorar:      'secondary',
}

export default async function UsuariosAdminPage() {
  const admin = createAdminClient() as any

  const [profilesRes, membershipsRes, authRes] = await Promise.all([
    admin.from('user_profiles').select('*').order('created_at', { ascending: false }),
    admin.from('memberships').select('user_id, tenants(name)'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profiles: any[] = profilesRes.data ?? []
  const memberships: any[] = membershipsRes.data ?? []
  const authUsers: any[] = authRes.data?.users ?? []

  // maps
  const emailMap = new Map<string, string>(
    authUsers.map((u: any) => [u.id as string, u.email as string])
  )
  const tenantMap = new Map<string, string>()
  for (const m of memberships) {
    if (!tenantMap.has(m.user_id)) {
      const name = (m.tenants as { name: string } | null)?.name
      if (name) tenantMap.set(m.user_id, name)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {profiles.length} usuário{profiles.length !== 1 ? 's' : ''} com perfil de onboarding
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Fazenda</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">WhatsApp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Posição</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Origem</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Animais</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Controle atual</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Atividades</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Objetivos</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Como começou</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {!profiles.length ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-muted-foreground">
                  Nenhum usuário com perfil encontrado.
                </td>
              </tr>
            ) : profiles.map((p) => {
              const email = emailMap.get(p.user_id) ?? '—'
              const fazenda = tenantMap.get(p.user_id) ?? '—'
              const activities: string[] = p.activities ?? []
              const objectives: string[] = p.objectives ?? []
              const startVariant = START_VARIANT[p.onboarding_start_path] ?? 'secondary'

              return (
                <tr key={p.user_id} className="border-b last:border-0 hover:bg-muted/20 align-top">
                  {/* Usuário */}
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[180px]">{email}</p>
                  </td>

                  {/* Fazenda */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fazenda}</td>

                  {/* WhatsApp */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.whatsapp ? (
                      <a
                        href={`https://wa.me/55${p.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-mono text-xs"
                      >
                        {p.whatsapp}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Posição */}
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {POSITION_LABEL[p.position] ?? p.position ?? '—'}
                  </td>

                  {/* Origem */}
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {SOURCE_LABEL[p.referral_source] ?? p.referral_source ?? '—'}
                  </td>

                  {/* Animais */}
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {p.animal_count_range ?? '—'}
                  </td>

                  {/* Controle atual */}
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {CONTROL_LABEL[p.current_control] ?? p.current_control ?? '—'}
                  </td>

                  {/* Atividades */}
                  <td className="px-4 py-3">
                    {activities.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {activities.map((a) => (
                          <span key={a} className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Objetivos */}
                  <td className="px-4 py-3">
                    {objectives.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {objectives.map((o) => (
                          <span key={o} className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                            {o}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Como começou */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.onboarding_start_path ? (
                      <Badge variant={startVariant}>
                        {START_LABEL[p.onboarding_start_path] ?? p.onboarding_start_path}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Cadastro */}
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
