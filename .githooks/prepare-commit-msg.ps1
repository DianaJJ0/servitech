Param(
  [string]$msgFile,
  [string]$source,
  [string]$sha
)

# No sobrescribir mensajes de merge/squash
if ($source -match 'merge|squash') { exit 0 }

try {
  if (Test-Path $msgFile) {
    $existing = Get-Content -Raw -LiteralPath $msgFile -ErrorAction SilentlyContinue
    if ($existing -and $existing.Trim().Length -gt 0) { exit 0 }
  }
} catch { exit 0 }

function safeExec($cmd) {
  try {
    $out = & sh -c $cmd 2>$null
    return ($out -join "`n").Trim()
  } catch {
    return ""
  }
}

$status = safeExec('git status --porcelain')
if (-not $status) { exit 0 }

$lines = $status -split "`n" | Where-Object { $_ -ne '' }
$added = @()
$modified = @()
$deleted = @()
$renamed = @()

foreach ($ln in $lines) {
  $code = if ($ln.Length -ge 2) { $ln.Substring(0,2).Trim() } else { '' }
  $rest = if ($ln.Length -gt 3) { $ln.Substring(3).Trim() } else { $ln.Trim() }
  if ($code -match '^A') { $added += $rest }
  elseif ($code -match '^M') { $modified += $rest }
  elseif ($code -match '^D') { $deleted += $rest }
  elseif ($code -match '^R') { $renamed += $rest }
  else {
    if ($rest -like '*->*') { $renamed += $rest } else { $modified += $rest }
  }
}

function listToString($arr) {
  if (-not $arr -or $arr.Count -eq 0) { return '' }
  return ($arr | ForEach-Object { "- $_" }) -join "`n"
}

$titleParts = @()
if ($modified.Count -gt 0) { $titleParts += "${($modified.Count)} modificad$($((if ($modified.Count -eq 1) { 'o' } else { 'os' })))" }
if ($added.Count -gt 0) { $titleParts += "${($added.Count)} agregad$($((if ($added.Count -eq 1) { 'o' } else { 'os' })))" }
if ($deleted.Count -gt 0) { $titleParts += "${($deleted.Count)} eliminad$($((if ($deleted.Count -eq 1) { 'o' } else { 'os' })))" }
if ($renamed.Count -gt 0) { $titleParts += "${($renamed.Count)} renombrad$($((if ($renamed.Count -eq 1) { 'o' } else { 'os' })))" }

$title = if ($titleParts.Count -gt 0) { "Actualización: " + ($titleParts -join ', ') } else { 'Actualización de código' }

$body = @()
if ($modified.Count -gt 0) { $body += "`nArchivos modificados:`n" + (listToString $modified) }
if ($added.Count -gt 0) { $body += "`nArchivos agregados:`n" + (listToString $added) }
if ($deleted.Count -gt 0) { $body += "`nArchivos eliminados:`n" + (listToString $deleted) }
if ($renamed.Count -gt 0) { $body += "`nArchivos renombrados:`n" + (listToString $renamed) }

$body += "`n\Notas:`n- Describe brevemente el porqué del cambio."

$full = $title + "`n`n" + ($body -join "`n")

try {
  Set-Content -LiteralPath $msgFile -Value $full -Encoding UTF8
} catch {
  # no bloquear commit si falla
}

exit 0
