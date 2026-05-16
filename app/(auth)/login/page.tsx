import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const { registered } = await searchParams
  return (
    <div className="rounded-xl border bg-card p-8 shadow">
      <h2 className="text-xl font-semibold mb-1">Entrar</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Acesse sua conta com e-mail e senha
      </p>
      <LoginForm registered={registered === '1'} />
    </div>
  )
}
