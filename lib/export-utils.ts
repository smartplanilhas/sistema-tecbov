export function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = rows.map(r => r.map(escape).join(',')).join('\n')
  const bom = '﻿' // UTF-8 BOM para Excel reconhecer acentos
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
