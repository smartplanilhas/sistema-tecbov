'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Check, AlertCircle, X, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importarPesagensCsv, type ImportResult } from './import-actions'

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SIZE    = 2 * 1024 * 1024
const MAX_ROWS    = 1000
const MIME_OK     = new Set(['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'])
const SELECT_CLS  = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

// ─── Types ────────────────────────────────────────────────────────────────────

type Animal = { id: string; brinco: string | null }

type PreviewRow = {
  rowNum: number
  brinco: string
  peso: number | null
  status: 'ok' | 'nao_encontrado' | 'erro'
  errorMsg?: string
}

// ─── CSV parsing (client-side, for preview only) ──────────────────────────────

function parsePreview(text: string, animals: Animal[]): { rows: PreviewRow[]; error: string | null } {
  const brincoSet = new Set(animals.map(a => a.brinco).filter(Boolean) as string[])
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)

  if (lines.length < 2) return { rows: [], error: 'CSV vazio ou sem dados.' }
  if (lines.length - 1 > MAX_ROWS) return { rows: [], error: `Máximo de ${MAX_ROWS} linhas.` }

  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers   = lines[0].split(delimiter).map(h => h.trim().toLowerCase())
  const brincoIdx = headers.indexOf('brinco')
  const pesoIdx   = headers.indexOf('peso')

  if (brincoIdx === -1 || pesoIdx === -1) {
    return { rows: [], error: 'O CSV precisa ter as colunas "brinco" e "peso".' }
  }

  const rows: PreviewRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols    = lines[i].split(delimiter)
    const brinco  = (cols[brincoIdx] ?? '').trim()
    const rawPeso = (cols[pesoIdx] ?? '').trim().replace(',', '.')
    const peso    = parseFloat(rawPeso)

    if (!brinco) {
      rows.push({ rowNum: i + 1, brinco: '—', peso: null, status: 'erro', errorMsg: 'Brinco vazio' })
      continue
    }

    if (isNaN(peso) || peso < 0.5 || peso > 2000) {
      rows.push({ rowNum: i + 1, brinco, peso: null, status: 'erro', errorMsg: `Peso inválido: "${rawPeso}"` })
      continue
    }

    rows.push({
      rowNum: i + 1,
      brinco,
      peso,
      status: brincoSet.has(brinco) ? 'ok' : 'nao_encontrado',
    })
  }

  return { rows, error: null }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PesagemImportView({
  tenantSlug,
  animals,
  onClose,
}: {
  tenantSlug: string
  animals: Animal[]
  onClose: () => void
}) {
  const today   = new Date().toISOString().split('T')[0]
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [fileError, setFileError] = useState<string | null>(null)
  const [preview, setPreview]     = useState<PreviewRow[] | null>(null)
  const [rawCsv, setRawCsv]       = useState('')
  const [fileName, setFileName]   = useState('')
  const [dataInput, setDataInput] = useState(today)
  const [tipoInput, setTipoInput] = useState('controle')
  const [result, setResult]       = useState<ImportResult | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    setPreview(null)
    setResult(null)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('O arquivo deve ter extensão .csv')
      return
    }
    if (file.type && !MIME_OK.has(file.type)) {
      setFileError('Tipo de arquivo não permitido.')
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('Arquivo muito grande (máximo 2 MB).')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRawCsv(text)
      const { rows, error } = parsePreview(text, animals)
      if (error) { setFileError(error); return }
      setPreview(rows)
    }
    reader.onerror = () => setFileError('Erro ao ler o arquivo.')
    reader.readAsText(file, 'UTF-8')
  }

  function handleImport() {
    if (!rawCsv || !dataInput) return
    startTransition(async () => {
      const res = await importarPesagensCsv(tenantSlug, rawCsv, dataInput, tipoInput)
      if ('error' in res) { setFileError(res.error); return }
      setResult(res)
      setPreview(null)
    })
  }

  function resetUpload() {
    setResult(null)
    setPreview(null)
    setRawCsv('')
    setFileName('')
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const okRows    = preview?.filter(r => r.status === 'ok').length ?? 0
  const missing   = preview?.filter(r => r.status === 'nao_encontrado').length ?? 0
  const errRows   = preview?.filter(r => r.status === 'erro').length ?? 0

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          Importar pesagens via CSV
        </h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Result ── */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-green-50 border-green-200 p-4 space-y-2">
            <p className="flex items-center gap-2 text-green-700 font-medium text-sm">
              <Check className="h-4 w-4 shrink-0" />
              {result.inserted} pesagem{result.inserted !== 1 ? 'ns' : ''} registrada{result.inserted !== 1 ? 's' : ''} com sucesso.
            </p>
            {result.notFound.length > 0 && (
              <div>
                <p className="text-sm text-amber-700 font-medium">
                  {result.notFound.length} brinco{result.notFound.length !== 1 ? 's' : ''} não encontrado{result.notFound.length !== 1 ? 's' : ''}:
                </p>
                <p className="text-xs text-amber-600 mt-0.5 font-mono">{result.notFound.join(', ')}</p>
              </div>
            )}
            {result.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {result.errors.length} linha{result.errors.length !== 1 ? 's' : ''} ignorada{result.errors.length !== 1 ? 's' : ''} por erro de formato.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetUpload}>Nova importação</Button>
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}

      {/* ── Upload + preview ── */}
      {!result && (
        <>
          {/* Drop zone */}
          <div className="space-y-2">
            <Label>Arquivo CSV <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Colunas obrigatórias: <code className="bg-muted px-1 rounded text-xs">brinco</code> e{' '}
              <code className="bg-muted px-1 rounded text-xs">peso</code>. Separador: vírgula ou ponto-e-vírgula. Máx. 1.000 linhas, 2 MB.
            </p>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              {fileName
                ? <p className="text-sm font-medium">{fileName}</p>
                : <p className="text-sm text-muted-foreground">Clique para selecionar o arquivo CSV</p>
              }
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {fileError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {fileError}
              </p>
            )}
          </div>

          {/* Date + tipo + preview */}
          {preview && (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <Label>Data das pesagens <span className="text-destructive">*</span></Label>
                  <Input type="date" value={dataInput} onChange={e => setDataInput(e.target.value)} required />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <Label>Tipo</Label>
                  <select value={tipoInput} onChange={e => setTipoInput(e.target.value)} className={SELECT_CLS}>
                    <option value="controle">Controle</option>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-green-700 font-medium">{okRows} para importar</span>
                {missing > 0 && (
                  <span className="text-amber-600">{missing} brinco{missing !== 1 ? 's' : ''} não cadastrado{missing !== 1 ? 's' : ''}</span>
                )}
                {errRows > 0 && (
                  <span className="text-destructive">{errRows} linha{errRows !== 1 ? 's' : ''} com erro</span>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Linha</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Brinco</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Peso (kg)</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map(row => (
                        <tr
                          key={row.rowNum}
                          className={
                            row.status === 'erro'           ? 'bg-red-50/60' :
                            row.status === 'nao_encontrado' ? 'bg-amber-50/60' : ''
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row.rowNum}</td>
                          <td className="px-3 py-2 font-mono">{row.brinco}</td>
                          <td className="px-3 py-2 text-right">
                            {row.peso != null
                              ? row.peso.toLocaleString('pt-BR', { minimumFractionDigits: 1 })
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {row.status === 'ok'             && <span className="text-xs text-green-700 font-medium">Encontrado</span>}
                            {row.status === 'nao_encontrado' && <span className="text-xs text-amber-600">Brinco não cadastrado</span>}
                            {row.status === 'erro'           && <span className="text-xs text-destructive">{row.errorMsg}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
                <Button
                  onClick={handleImport}
                  disabled={isPending || okRows === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isPending ? 'Importando…' : `Importar ${okRows} pesagem${okRows !== 1 ? 'ns' : ''}`}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
