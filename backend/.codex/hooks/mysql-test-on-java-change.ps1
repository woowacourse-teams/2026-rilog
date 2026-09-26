$payloadText = [Console]::In.ReadToEnd()
$payload = $payloadText | ConvertFrom-Json

$repoRoot = (& git -C $payload.cwd rev-parse --show-toplevel 2>$null).Trim()

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    @{
        continue = $true
    } | ConvertTo-Json -Compress

    exit 0
}

$changes = @(
    & git -C $repoRoot status `
        --porcelain=v1 `
        --untracked-files=all `
        -- backend/src
)

$javaChanges = @(
    $changes | Where-Object {
        $_ -match '\.java$'
    }
)

if ($javaChanges.Count -eq 0) {
    @{
        continue = $true
    } | ConvertTo-Json -Compress

    exit 0
}

$backendDirectory = Join-Path $repoRoot "backend"
$gradleWrapper = Join-Path $backendDirectory "gradlew.bat"

Push-Location $backendDirectory

try {
    $testOutput = & $gradleWrapper testMySql --no-daemon 2>&1 | Out-String
    $testExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($testExitCode -eq 0) {
    @{
        continue = $true
    } | ConvertTo-Json -Compress

    exit 0
}

$outputTail = (
    $testOutput -split "\r?\n" |
        Select-Object -Last 80
) -join [Environment]::NewLine

@{
    decision = "block"
    reason = @"
backend/src 아래 Java 파일 변경 이후 MySQL 테스트가 실패했습니다.
실패 원인을 수정한 뒤 testMySql을 다시 실행하세요.

$outputTail
"@
} | ConvertTo-Json -Compress

exit 0
