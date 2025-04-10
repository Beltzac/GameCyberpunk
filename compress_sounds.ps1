# Define the root directory containing sound files
$rootDir = "src/assets"
$totalOriginalSize = 0
$totalNewSize = 0
$filesProcessed = @()

# Find all WAV files and convert them to MP3
Get-ChildItem -Path $rootDir -Filter *.wav -Recurse | ForEach-Object {
 $originalSize = $_.Length
 $totalOriginalSize += $originalSize
 $outputFile = $_.FullName -replace '\.wav$', '.mp3'
ffmpeg -i $_.FullName -vn -ar 44100 -ac 2 -b:a 96k -f mp3 $outputFile
 $newSize = (Get-Item $outputFile).Length
 $totalNewSize += $newSize
 if ($?) {
 $filesProcessed += [PSCustomObject]@{
 File = $outputFile
 OriginalSize = $originalSize
 NewSize = $newSize
 Savings = "$(100 - (($newSize / $originalSize) * 100))%"
 }
 Write-Host "Converted $($_.FullName) ($($originalSize) bytes) to $outputFile ($($newSize) bytes)"
 Remove-Item $_.FullName
 Write-Host "Removed $($_.FullName)"
 } else {
 Write-Host "Failed to convert $($_.FullName)"
 }
}

# Find all MP3 files and compress them
Get-ChildItem -Path $rootDir -Filter *.mp3 -Recurse | ForEach-Object {
 $originalSize = $_.Length
 $totalOriginalSize += $originalSize
$outputFile = $_.FullName -replace '\.mp3$', '_compressed.mp3'
ffmpeg -i $_.FullName -vn -ar 44100 -ac 2 -b:a 96k -f mp3 $outputFile
 $newSize = (Get-Item $outputFile).Length
 if ($?) {
 Write-Host "Compressed $($_.FullName) ($($originalSize) bytes) to $outputFile ($($newSize) bytes)"
 if ($newSize -lt $originalSize) {
 Move-Item -Path $outputFile -Destination $_.FullName -Force
 $totalNewSize += $newSize
 $filesProcessed += [PSCustomObject]@{
 File = $_.FullName
 OriginalSize = $originalSize
 NewSize = $newSize
 Savings = "$(100 - (($newSize / $originalSize) * 100))%"
 }
 Write-Host "Replaced $($_.FullName) with compressed version"
 } else {
 Remove-Item $outputFile
 $filesProcessed += [PSCustomObject]@{
 File = $_.FullName
 OriginalSize = $originalSize
 NewSize = $originalSize
 Savings = "0%"
 }
 Write-Host "Compressed file is larger, discarded $outputFile"
 }
 } else {
 $filesProcessed += [PSCustomObject]@{
 File = $_.FullName
 OriginalSize = $originalSize
 NewSize = $originalSize
 Savings = "0%"
 }
 Write-Host "Failed to compress $($_.FullName)"
 }
}

# Output the results
$filesProcessed | Format-Table -AutoSize
$totalSavings = "$(100 - (($totalNewSize / $totalOriginalSize) * 100))%"
Write-Host "Total original size: $($totalOriginalSize) bytes"
Write-Host "Total new size: $($totalNewSize) bytes"
Write-Host "Total savings: $totalSavings"
