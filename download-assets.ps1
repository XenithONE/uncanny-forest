$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot 'public/assets'
New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
$records = [System.Collections.Generic.List[object]]::new()
function Save-Asset($entry, $relative) {
  if (-not $entry.url) { throw "Missing URL for $relative" }
  $destination = Join-Path $assetRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
  if (-not (Test-Path -LiteralPath $destination)) { Invoke-WebRequest -Uri $entry.url -OutFile $destination }
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm MD5).Hash.ToLower()
  if ($hash -ne $entry.md5) { throw "Hash mismatch: $relative" }
  $records.Add([PSCustomObject]@{path=$relative;url=$entry.url;md5=$hash;bytes=(Get-Item -LiteralPath $destination).Length})
}
foreach ($model in @('fern_02','dead_tree_trunk','moss_01','anthurium_botany_01','shrub_04')) {
  $files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$model"
  $resolution = if ($model -eq 'fern_02') { '4k' } else { '2k' }
  $entry = $files.gltf.$resolution.gltf
  Save-Asset $entry "$model/$model.gltf"
  foreach ($part in $entry.include.PSObject.Properties) { Save-Asset $part.Value "$model/$($part.Name)" }
  if ($files.Alpha.$resolution.png) { Save-Asset $files.Alpha.$resolution.png "$model/alpha.png" }
  Write-Output "Downloaded and verified: $model"
}
foreach ($material in @('moss_wood','forest_floor')) {
  $files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$material"
  foreach ($map in @('diff','nor_gl','rough')) { $key = @{diff='Diffuse';nor_gl='nor_gl';rough='Rough'}[$map]; Save-Asset $files.$key.'2k'.jpg "$material/$map.jpg" }
  Write-Output "Downloaded and verified: $material"
}
$files = Invoke-RestMethod -Uri 'https://api.polyhaven.com/files/mossy_forest'
Save-Asset $files.hdri.'1k'.hdr 'mossy_forest.hdr'
$records | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $assetRoot 'manifest.json') -Encoding utf8
Write-Output "Verified $($records.Count) files."
