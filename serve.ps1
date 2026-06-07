param(
  [int]$Port = 8000
)

Write-Output "Starting simple PowerShell static file server on http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
# bind to localhost to avoid requiring admin privileges
$prefix = "http://localhost:{0}/" -f $Port
$listener.Prefixes.Add($prefix)

try{
  $listener.Start()
} catch {
  Write-Error "Failed to start listener. Try running PowerShell as Administrator or pick a different port. $_"
  exit 1
}

function Get-ContentType([string]$path){
  switch ([System.IO.Path]::GetExtension($path).ToLower()){
    '.html' { 'text/html' }
    '.htm'  { 'text/html' }
    '.css'  { 'text/css' }
    '.js'   { 'application/javascript' }
    '.json' { 'application/json' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.svg'  { 'image/svg+xml' }
    '.txt'  { 'text/plain' }
    '.ico'  { 'image/x-icon' }
    default { 'application/octet-stream' }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $rawPath = $req.Url.LocalPath.TrimStart('/')
  if ([string]::IsNullOrEmpty($rawPath)) { $rawPath = 'index.html' }
  $fsPath = Join-Path -Path (Get-Location) -ChildPath $rawPath
  if (-not (Test-Path $fsPath)){
    $context.Response.StatusCode = 404
    $notFound = "404 Not Found"
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($notFound)
    $context.Response.ContentType = 'text/plain'
    $context.Response.ContentLength64 = $buffer.Length
    $context.Response.OutputStream.Write($buffer,0,$buffer.Length)
    $context.Response.OutputStream.Close()
    continue
  }
  try{
    $bytes = [System.IO.File]::ReadAllBytes($fsPath)
    $context.Response.ContentType = Get-ContentType $fsPath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $context.Response.OutputStream.Close()
  } catch {
    $context.Response.StatusCode = 500
    $msg = "500 Internal Server Error"
    $b = [System.Text.Encoding]::UTF8.GetBytes($msg)
    $context.Response.ContentType = 'text/plain'
    $context.Response.ContentLength64 = $b.Length
    $context.Response.OutputStream.Write($b,0,$b.Length)
    $context.Response.OutputStream.Close()
  }
}

try{ $listener.Stop() } catch {}
