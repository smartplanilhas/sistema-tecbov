import { RegisterForm } from './register-form'

export default function RegisterPage() {
  return (
    <div className="rounded-xl border bg-card p-8 shadow">
      <h2 className="text-xl font-semibold mb-1">Criar conta</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Cadastre-se e comece a usar o Tecbov
      </p>
      <RegisterForm />
    </div>
  )
}
