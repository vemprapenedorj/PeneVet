Add-Type -AssemblyName System.Drawing

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out = Join-Path $workspace 'saidas\previas-site'
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item (Join-Path $workspace 'saidas\site-captura.png') (Join-Path $out '01-abertura.png') -Force

function Color([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}
function Brush([string]$hex) {
  return [System.Drawing.SolidBrush]::new((Color $hex))
}
function RoundRect($g, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r, [string]$fill) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $b = Brush $fill
  $g.FillPath($b, $p)
  $b.Dispose()
  $p.Dispose()
}
function Text($g, [string]$value, [single]$x, [single]$y, [single]$w, [single]$h, [single]$size, [string]$color, [bool]$bold=$false) {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = [System.Drawing.Font]::new('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = Brush $color
  $fmt = [System.Drawing.StringFormat]::new()
  $fmt.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($value, $font, $brush, [System.Drawing.RectangleF]::new($x,$y,$w,$h), $fmt)
  $font.Dispose(); $brush.Dispose(); $fmt.Dispose()
}
function Canvas {
  $bmp = [System.Drawing.Bitmap]::new(1200,750)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear((Color '#ffffff'))
  return @($bmp,$g)
}
function SaveCanvas($bmp,$g,[string]$name) {
  $g.Dispose()
  $bmp.Save((Join-Path $out $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
function Photo($g,[string]$path,[single]$x,[single]$y,[single]$w,[single]$h) {
  $img = [System.Drawing.Image]::FromFile($path)
  $ratio = [Math]::Max($w/$img.Width,$h/$img.Height)
  $sw = $w/$ratio; $sh = $h/$ratio
  $sx = ($img.Width-$sw)/2; $sy = ($img.Height-$sh)/2
  $g.DrawImage($img,[System.Drawing.RectangleF]::new($x,$y,$w,$h),[System.Drawing.RectangleF]::new($sx,$sy,$sw,$sh),[System.Drawing.GraphicsUnit]::Pixel)
  $img.Dispose()
}

$canvas = Canvas; $bmp = $canvas[0]; $g = $canvas[1]
Text $g 'PENEVET  /  SERVIÇOS' 50 36 500 26 16 '#267d70' $true
Text $g 'Tudo o que seu animal precisa,' 50 70 870 60 46 '#24233a' $true
Text $g 'em um só lugar.' 50 125 650 60 46 '#805aa2' $true
Text $g 'Atendimento para cães, gatos e animais exóticos ou silvestres.' 50 188 900 32 21 '#666778'
$cards = @(
  @('01','Consultas e clínica geral','Avaliação, orientação e acompanhamento.','#fbfaf8'),
  @('02','Especialidades','Cardiologia, dermatologia, oftalmologia e nefrologia.','#f5eff8'),
  @('03','Cirurgias e internação','Atendimento cirúrgico e monitoramento 24 horas.','#f0f8f5'),
  @('04','Exames e diagnóstico','Ultrassom, radiografia e exames laboratoriais.','#fbfaf8'),
  @('05','Prevenção','Vacinação e check-ups em cada fase da vida.','#f0f8f5'),
  @('06','Exóticos e silvestres','Cuidados para animais com necessidades específicas.','#f5eff8')
)
for($i=0;$i -lt $cards.Count;$i++){
  $col=$i%3; $row=[Math]::Floor($i/3)
  $x=[single](50+$col*373); $y=[single](250+$row*230)
  RoundRect $g $x $y 354 208 18 $cards[$i][3]
  RoundRect $g ($x+24) ($y+23) 46 46 13 '#ffffff'
  Text $g '+' ($x+35) ($y+26) 30 35 23 '#267d70' $true
  Text $g $cards[$i][0] ($x+304) ($y+25) 36 24 15 '#aaa3ae' $true
  Text $g $cards[$i][1] ($x+24) ($y+86) 305 38 21 '#24233a' $true
  Text $g $cards[$i][2] ($x+24) ($y+132) 305 56 16 '#666778'
}
SaveCanvas $bmp $g '02-servicos.png'

$canvas = Canvas; $bmp = $canvas[0]; $g = $canvas[1]
RoundRect $g 45 42 1110 330 26 '#795799'
Text $g 'VAMOS CUIDAR JUNTOS?' 84 78 500 28 17 '#c5f2e5' $true
Text $g 'O primeiro passo é' 84 118 585 58 44 '#ffffff' $true
Text $g 'conversar.' 84 172 520 62 48 '#baf2e0' $true
Text $g 'Agende uma consulta ou tire suas dúvidas. Estamos aqui para acolher você e seu animal.' 84 244 550 65 18 '#f5eefa'
RoundRect $g 84 314 235 45 22 '#ffffff'
Text $g 'Chamar no WhatsApp  ↗' 103 322 210 30 16 '#64457f' $true
Photo $g (Join-Path $workspace 'site-penevet\dist\assets\penevet-contato.jpg') 747 63 385 289
Text $g 'LOCALIZAÇÃO E CONTATO' 50 403 500 30 17 '#805aa2' $true
Text $g 'Venha nos visitar em Penedo.' 50 440 800 52 38 '#24233a' $true
RoundRect $g 50 515 630 195 18 '#e9f4f0'
RoundRect $g 72 538 585 150 13 '#f8faf7'
$roadPen = [System.Drawing.Pen]::new((Color '#d2dcca'),9)
$g.DrawLine($roadPen,105,660,560,555)
$g.DrawLine($roadPen,280,545,290,680)
$roadPen.Dispose()
RoundRect $g 367 577 168 51 15 '#ffffff'
Text $g 'PeneVet' 382 587 140 35 18 '#267d70' $true
Text $g 'MAPA INTERATIVO NO SITE' 86 539 320 25 13 '#267d70' $true
RoundRect $g 707 515 445 195 18 '#f6f2f4'
Text $g 'Av. Brasil, 145' 731 535 380 32 23 '#24233a' $true
Text $g 'Penedo, Itatiaia – RJ  •  CEP 27580-000' 731 572 390 42 17 '#666778'
Text $g 'Seg–sex  8h às 19h  |  Sáb  8h às 13h30' 731 618 390 32 16 '#666778'
Text $g '(24) 99322-0195' 731 657 390 34 20 '#267d70' $true
SaveCanvas $bmp $g '03-contato-localizacao.png'

$files = @('01-abertura.png','02-servicos.png','03-contato-localizacao.png')
$montage = [System.Drawing.Bitmap]::new(1200,2250)
$mg = [System.Drawing.Graphics]::FromImage($montage)
for($i=0;$i -lt $files.Count;$i++){
  $im = [System.Drawing.Image]::FromFile((Join-Path $out $files[$i]))
  $mg.DrawImage($im,0,($i*750),1200,750)
  $im.Dispose()
}
$mg.Dispose()
$montage.Save((Join-Path $out '00-visao-geral.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$montage.Dispose()
Get-ChildItem $out -Filter '*.png' | Select-Object Name,Length
