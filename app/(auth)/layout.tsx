import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="Tecbov" width={52} height={52} />
          <h1 className="text-2xl font-bold tracking-tight">Tecbov</h1>
          <p className="text-muted-foreground text-sm">Sistema de gestão pecuária</p>
        </div>
        {children}
      </div>
    </div>
  )
}
