cd frontend

$files = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Encoding UTF8
    $content = $content -replace 'http://localhost:3003', '${process.env.NEXT_PUBLIC_API_URL}'
    $content = $content -replace 'https://taxpilot-en-backend.*?\.vercel\.app', '${process.env.NEXT_PUBLIC_API_URL}'
    Set-Content $file.FullName $content -Encoding UTF8
}

Write-Host "Replace completato!"