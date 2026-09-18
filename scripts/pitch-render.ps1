$ErrorActionPreference = 'Stop'
$pitchDir = Join-Path (Get-Location) 'docs/pitch-technical'
$pitchDeckPath = Join-Path $pitchDir 'CUSTOS-TECHNICAL-PITCH.pptx'
$pitchPreview = Join-Path $pitchDir 'slides'
New-Item -ItemType Directory -Force -Path $pitchPreview | Out-Null
$pitchApp = New-Object -ComObject PowerPoint.Application
try {
  $pitchDeck = $pitchApp.Presentations.Open($pitchDeckPath, $true, $false, $false)
  $pitchDeck.Export((Join-Path $pitchDir 'CUSTOS-TECHNICAL-PITCH.pdf'), 'PDF')
  for ($pitchIndex = 1; $pitchIndex -le $pitchDeck.Slides.Count; $pitchIndex++) {
    $pitchSlide = $pitchDeck.Slides.Item($pitchIndex)
    $pitchSlide.Export((Join-Path $pitchPreview ('slide-{0:D2}.png' -f $pitchIndex)), 'PNG', 1920, 1080)
  }
  Write-Output ('Rendered {0} slides with PowerPoint' -f $pitchDeck.Slides.Count)
  $pitchDeck.Close()
} finally { $pitchApp.Quit() }
