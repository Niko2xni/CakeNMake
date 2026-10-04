# smoke-test-cake-ai.ps1
# Same request as before, but catches non-2xx responses cleanly instead
# of dumping a PowerShell stack trace — Invoke-RestMethod throws on any
# 4xx/5xx by design, it's not a bug in the request itself.

$body = @{
    messages = @(
        @{ role = "user"; content = "make it chocolate" }
    )
    config = @{
        structure      = @{ size = "big"; layers = 1; layerDesign = "uniform" }
        sponge         = @{ flavor = "vanilla" }
        filling        = @{ enabled = $false; layers = 1 }
        exteriorFinish = @{ style = "fullyFrosted"; flavor = "vanilla" }
    }
} | ConvertTo-Json -Depth 10

try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/cake-ai/message" `
        -Method POST -ContentType "application/json" -Body $body

    Write-Host "✅ Success:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 10
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Request failed with status $statusCode" -ForegroundColor Red

    # PowerShell 7+ exposes the response body directly; PS 5.1 needs it
    # read off the stream manually — this covers both.
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } elseif ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host $reader.ReadToEnd()
    }

    Write-Host "`nNow check your Node/Express terminal for a line starting with:"
    Write-Host "  [cake-ai:gemini] request failed: ..."
    Write-Host "That has the real underlying error (bad key, quota, model name, etc)."
}