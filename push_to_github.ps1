<#
Usage: Run this script from the repository root to commit and push files to GitHub.

It requires Git to be installed and that you have credentials configured (HTTPS PAT or SSH key).

Example:
  .\push_to_github.ps1 -RemoteUrl "https://github.com/youruser/yourrepo.git"

If the remote repo does not exist yet, create it on GitHub first (or use the GitHub website).
#>

param(
  [string]$RemoteUrl,
  [string]$CommitMessage = 'Initial site commit',
  [string]$Branch = 'main'
)

function ExitWithError($msg){ Write-Host $msg -ForegroundColor Red; exit 1 }

if(-not (Get-Command git -ErrorAction SilentlyContinue)){
  ExitWithError 'Git is not installed or not available in PATH. Please install Git and try again.'
}

if(-not $RemoteUrl){
  $RemoteUrl = Read-Host 'Enter the Git remote URL (e.g. https://github.com/you/repo.git)'
}

if(-not $RemoteUrl){ ExitWithError 'No remote URL provided. Aborting.' }

Write-Host "Using remote: $RemoteUrl"

try{
  if(-not (Test-Path .git)){
    git init
  }
  git add --all
  git commit -m "$CommitMessage" 2>$null | Out-Null
  git branch -M $Branch 2>$null | Out-Null
  if(-not (git remote get-url origin 2>$null)){
    git remote add origin $RemoteUrl
  } else {
    git remote set-url origin $RemoteUrl
  }

  Write-Host 'Pushing to remote (you may be prompted for credentials)...'
  git push -u origin $Branch
  if($LASTEXITCODE -ne 0){ ExitWithError 'Push failed. Check your credentials and remote URL.' }
  Write-Host 'Push completed successfully.' -ForegroundColor Green
} catch {
  ExitWithError "Error: $($_.Exception.Message)"
}
