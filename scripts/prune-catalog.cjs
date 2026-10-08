// Retire du catalogue les entrées qui n'ont rien à voir avec le bug bounty
// (logiciels générateurs, navigateurs, IDE, runtimes multiples, IaC, cloud,
// remote desktop, messageries...). Usage : node scripts/prune-catalog.cjs
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'src', 'main', 'services', 'tools', 'catalog.ts')

const REMOVE = new Set([
  // archives / CLI generalistes
  '7zip', 'bat', 'fd', 'fzf', 'delta', 'eza', 'hyperfine',
  // utilitaires Windows
  'everything', 'powertoys', 'autohotkey', 'windirstat', 'sumatrapdf', 'rufus', 'ventoy',
  'crystaldiskinfo', 'crystaldiskmark',
  // Sysinternals (triage/malware, pas web bounty)
  'procexp', 'procmon', 'autoruns', 'handle', 'sigcheck', 'rammap',
  // terminaux / editeurs / IDE
  'terminal', 'alacritty', 'vscode', 'vscodium', 'neovim', 'notepadplusplus',
  'intellij-idea', 'pycharm', 'rider',
  // runtimes / toolchains en double (python 3.12, go, node, git, ripgrep, jq, yq restent)
  'python311', 'python310', 'python313', 'deno', 'bun', 'pnpm', 'yarn', 'volta',
  'rustup', 'php', 'ruby', 'openjdk21', 'temurin21', 'zulu21', 'openjdk17', 'temurin8',
  'zulu17', 'dotnet-sdk8', 'dotnet-sdk9', 'dotnet-desktop8', 'dotnet6', 'cmake', 'ninja',
  'vs-buildtools',
  // git GUI / SSH generalistes
  'gh', 'github-desktop', 'tortoisegit', 'putty', 'termius',
  // BDD / conteneurs / IaC / cloud
  'sqlitesuite', 'redis', 'docker-desktop', 'wsl', 'debian', 'virtualbox', 'helm',
  'kubectl', 'terraform', 'packer', 'vagrant', 'consul', 'nomad', 'vault',
  'awscli', 'azurecli', 'gcloud',
  // navigateurs
  'browser-tor', 'firefox', 'chrome', 'brave', 'librewolf',
  // VPN / remote desktop
  'openvpn', 'wireguard', 'warp', 'tailscale', 'anydesk', 'teamviewer', 'vncviewer',
  // bureautique / multimedia / messageries
  'heidisql', 'drawio', 'obsidian', 'bitwarden', 'obs-studio', 'ffmpeg', 'thunderbird',
  'discord', 'slack', 'zoom'
])

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/)
const out = []
let i = 0
let removed = 0
while (i < lines.length) {
  if (lines[i] === '  {' && lines[i + 1] && /^\s{4}id: '[^']+',?$/.test(lines[i + 1])) {
    // trouve la fin de l'entree (  }, )
    let j = i
    while (j < lines.length && lines[j] !== '  },') j++
    const id = lines[i + 1].match(/id: '([^']+)'/)[1]
    if (REMOVE.has(id)) {
      removed++
      i = j + 1 // saute l'entiere
      continue
    }
  }
  out.push(lines[i])
  i++
}

const missing = [...REMOVE].filter((id) => {
  // on sait qu'on l'a vue si removed correspond; on recalcule
  return false
})
fs.writeFileSync(FILE, out.join('\n'), 'utf8')
console.log(`entrees retirees : ${removed} / ${REMOVE.size}`)
if (removed !== REMOVE.size) {
  console.error(`ATTENTION : ${REMOVE.size - removed} ids non trouves dans le fichier`)
  process.exitCode = 1
}
