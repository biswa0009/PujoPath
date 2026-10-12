$port = 5173
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "FindPujo server running at http://localhost:$port/"
    $distPath = Join-Path $PSScriptRoot "dist"
    
    $mimeTypes = @{
        ".html"  = "text/html; charset=utf-8"
        ".js"    = "application/javascript; charset=utf-8"
        ".mjs"   = "application/javascript; charset=utf-8"
        ".css"   = "text/css; charset=utf-8"
        ".json"  = "application/json"
        ".svg"   = "image/svg+xml"
        ".png"   = "image/png"
        ".jpg"   = "image/jpeg"
        ".jpeg"  = "image/jpeg"
        ".ico"   = "image/x-icon"
        ".woff"  = "font/woff"
        ".woff2" = "font/woff2"
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "index.html"
        }

        $filePath = Join-Path $distPath $urlPath
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path $distPath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
}
