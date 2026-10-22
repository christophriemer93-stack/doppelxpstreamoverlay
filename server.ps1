# The Gentlemen Darts Club - Lightweight Native TCP Webserver (Keine Admin-Rechte noetig!)
$port = 8080
$dir = $PSScriptRoot

try {
    $ip = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString
} catch {
    $ip = "127.0.0.1"
}

Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host "   ❖ THE GENTLEMEN DARTS CLUB - SERVER AKTIV ❖" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "Dein PC laeuft im Netzwerk unter: " -NoNewline
Write-Host "$ip" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. HANDY-LINK (Im Smartphone Browser oeffnen):" -ForegroundColor Yellow
Write-Host "   http://$($ip):$($port)/darts_controller.html" -ForegroundColor Green
Write-Host ""
Write-Host "2. OBS OVERLAY (In OBS Browserquelle eintragen):" -ForegroundColor Yellow
Write-Host "   http://localhost:$($port)/darts_overlay.html" -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host "Server laeuft stabil... Fenster einfach geoeffnet lassen!" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host ""

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
try {
    $listener.Start()
} catch {
    Write-Host "Fehler beim Binden an Port $port : $_" -ForegroundColor Red
    pause
    exit
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        [System.Threading.ThreadPool]::QueueUserWorkItem({
            param($tcpClient)
            try {
                $stream = $tcpClient.GetStream()
                $buffer = New-Object byte[] 4096
                $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                if ($bytesRead -gt 0) {
                    $requestString = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
                    $firstLine = $requestString.Split("`r`n")[0]
                    $tokens = $firstLine.Split(" ")
                    if ($tokens.Length -ge 2) {
                        $rawPath = $tokens[1].TrimStart('/')
                        if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = "darts_controller.html" }
                        # Query String abtrennen
                        $cleanPath = $rawPath.Split('?')[0]
                        $filePath = Join-Path $using:dir $cleanPath

                        if (Test-Path $filePath -PathType Leaf) {
                            $contentBytes = [System.IO.File]::ReadAllBytes($filePath)
                            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                            $mime = switch ($ext) {
                                ".html" { "text/html; charset=utf-8" }
                                ".js"   { "application/javascript; charset=utf-8" }
                                ".css"  { "text/css; charset=utf-8" }
                                ".png"  { "image/png" }
                                ".jpg"  { "image/jpeg" }
                                default { "application/octet-stream" }
                            }

                            $header = "HTTP/1.1 200 OK`r`n" +
                                      "Content-Type: $mime`r`n" +
                                      "Content-Length: $($contentBytes.Length)`r`n" +
                                      "Access-Control-Allow-Origin: *`r`n" +
                                      "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
                                      "Connection: close`r`n`r`n"
                            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                            $stream.Write($headerBytes, 0, $headerBytes.Length)
                            $stream.Write($contentBytes, 0, $contentBytes.Length)
                        } else {
                            $err = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                            $errBytes = [System.Text.Encoding]::UTF8.GetBytes($err)
                            $stream.Write($errBytes, 0, $errBytes.Length)
                        }
                    }
                }
            } catch {
            } finally {
                $tcpClient.Close()
            }
        }, $client) | Out-Null
    } catch {
    }
}
