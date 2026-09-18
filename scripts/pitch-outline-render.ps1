$ErrorActionPreference = 'Stop'
$custosOut = Join-Path (Get-Location) 'docs/pitch-technical'
$custosStem = 'CUSTOS-UNIHACKFEST-10-SLIDE'
$custosImages = Join-Path $custosOut 'slides-10'
New-Item -ItemType Directory -Force -Path $custosImages | Out-Null
$custosPowerPoint = New-Object -ComObject PowerPoint.Application
try {
  $custosPresentation = $custosPowerPoint.Presentations.Open((Join-Path $custosOut ($custosStem + '.pptx')), $true, $false, $false)
  $custosPresentation.Export((Join-Path $custosOut ($custosStem + '.pdf')), 'PDF')
  for ($custosIndex = 1; $custosIndex -le $custosPresentation.Slides.Count; $custosIndex++) {
    $custosPresentation.Slides.Item($custosIndex).Export((Join-Path $custosImages ('slide-{0:D2}.png' -f $custosIndex)), 'PNG', 1920, 1080)
  }
  Write-Output ('Rendered {0} slides and PDF.' -f $custosPresentation.Slides.Count)
  $custosPresentation.Close()
} finally { $custosPowerPoint.Quit() }
