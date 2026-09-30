const fs = require('node:fs')

const path = 'src/main/services/tools/catalog.ts'
const src = fs.readFileSync(path, 'utf-8')
const eol = src.includes('\r\n') ? '\r\n' : '\n'
const lines = src.split(/\r?\n/)

// Tables verifiees contre l'API GitHub (asset linux x86_64 retenu) et contre
// Contents-amd64 de Debian bookworm/trixie.
const linuxAsset = {
  nuclei: 'linux_amd64', subfinder: 'linux_amd64', httpx: 'linux_amd64',
  katana: 'linux_amd64', naabu: 'linux_amd64', dnsx: 'linux_amd64',
  asnmap: 'linux_amd64', uncover: 'linux_amd64', alterx: 'linux_amd64',
  amass: 'linux_amd64', aquatone: 'linux_amd64', tlsx: 'linux_amd64',
  chaos: 'linux_amd64', mapcidr: 'linux_amd64', cdncheck: 'linux_amd64',
  urlfinder: 'linux_amd64', shuffledns: 'linux_amd64', cloudlist: 'linux_amd64',
  gau: 'linux_amd64', cariddi: 'linux_amd64', notify: 'linux_amd64',
  simplehttpserver: 'linux_amd64', pdtm: 'linux_amd64',
  bettercap: 'linux_amd64', trufflehog: 'linux_amd64', gitleaks: 'linux_x64',
  waybackurls: 'linux-amd64', httprobe: 'linux-amd64', unfurl: 'linux-amd64',
  meg: 'linux-amd64', qsreplace: 'linux-amd64',
  gobuster: 'Linux_x86_64', dalfox: 'linux-x86_64.tar.gz',
  findomain: 'findomain-linux.zip', feroxbuster: 'x86_64-linux-feroxbuster.zip',
  rustscan: 'x86_64-linux-rustscan.tar.gz.zip'
}

// exe reellement present dans l'archive quand il differe de l'id
const exeName = { chaos: 'chaos-client' }

const aptPackage = {
  nmap: 'nmap', wireshark: 'wireshark', ffuf: 'ffuf', jq: 'jq', ripgrep: 'ripgrep',
  git: 'git', python: 'python3-minimal', go: 'golang-go', node: 'nodejs',
  '7zip': '7zip', bat: 'bat', fd: 'fd-find', fzf: 'fzf', delta: 'git-delta',
  eza: 'eza', hyperfine: 'hyperfine', alacritty: 'alacritty', neovim: 'neovim',
  whois: 'whois', python311: 'python3.11-minimal', python313: 'python3.13-minimal',
  rustup: 'rustup', ruby: 'ruby', openjdk21: 'openjdk-21-jre-headless',
  openjdk17: 'openjdk-17-jre-headless', cmake: 'cmake', ninja: 'ninja-build',
  gh: 'gh', putty: 'putty', sqlitesuite: 'sqlite3', redis: 'redis-tools',
  kubectl: 'kubectl', vagrant: 'vagrant', openvpn: 'openvpn',
  wireguard: 'wireguard-tools', vncviewer: 'tigervnc-viewer', ffmpeg: 'ffmpeg'
}

// detectCmd : le binaire reellement fourni par le gestionnaire, souvent different
// de l'id (rg, batcat, fdfind, nvim, pwsh, zap.sh, redis-cli...).
const detectCmd = {
  ripgrep: 'rg', bat: 'batcat', fd: 'fdfind', neovim: 'nvim', vncviewer: 'xtigervncviewer',
  powershell: 'pwsh', zap: 'zap.sh', ventoy: 'Ventoy2Disk', redis: 'redis-cli',
  python: 'python3', python311: 'python3.11', python310: 'python3.10', python313: 'python3.13',
  '7zip': '7z', wireshark: 'tshark', sqlitesuite: 'sqlite3', wireguard: 'wg',
  openjdk21: 'java', openjdk17: 'java', temurin21: 'java', temurin8: 'java',
  zulu21: 'java', zulu17: 'java', awscli: 'aws', azurecli: 'az', gcloud: 'gcloud',
  dotnet_sdk8: 'dotnet', dotnet_sdk9: 'dotnet', dotnet6: 'dotnet',
  dotnet_desktop8: 'dotnet', terraform: 'terraform', vault: 'vault', consul: 'consul',
  nomad: 'nomad', packer: 'packer', tailscale: 'tailscale', pnpm: 'pnpm',
  yarn: 'yarn', volta: 'volta', yq: 'yq', syft: 'syft', grype: 'grype',
  trivy: 'trivy', helm: 'helm', deno: 'deno', bun: 'bun', uv: 'uv', ollama: 'ollama'
}

// Windows uniquement : aucun portage Linux maintenu
const windowsOnly = [
  'everything', 'powertoys', 'autohotkey', 'terminal', 'vs-buildtools', 'wsl',
  'debian', 'procexp', 'procmon', 'autoruns', 'handle', 'sigcheck', 'rammap',
  'windirstat', 'tortoisegit', 'github-desktop', 'sumatrapdf', 'rufus',
  'crystaldiskinfo', 'crystaldiskmark', 'fiddler', 'chisel', 'docker-desktop'
]

// Applications graphiques : hors perimetre d'un utilitaire CLI
const guiOnly = [
  'vscode', 'vscodium', 'notepadplusplus', 'burpsuite', 'postman', 'insomnia',
  'bruno', 'termius', 'browser-tor', 'firefox', 'chrome', 'brave', 'librewolf',
  'warp', 'anydesk', 'teamviewer', 'heidisql', 'drawio', 'obsidian', 'bitwarden',
  'obs-studio', 'intellij-idea', 'pycharm', 'rider', 'discord', 'slack', 'zoom',
  'thunderbird', 'virtualbox'
]

const stats = { linuxAsset: 0, exeName: 0, apt: 0, detect: 0, win: 0, gui: 0, touched: 0 }
const out = []
let pending = []

function keysFor(id) {
  const extra = []
  if (linuxAsset[id]) { extra.push(`    githubAssetLinux: '${linuxAsset[id]}',`); stats.linuxAsset++ }
  if (exeName[id]) { extra.push(`    exeName: '${exeName[id]}',`); stats.exeName++ }
  if (aptPackage[id]) { extra.push(`    aptPackage: '${aptPackage[id]}',`); stats.apt++ }
  if (detectCmd[id]) { extra.push(`    detectCmd: '${detectCmd[id]}',`); stats.detect++ }
  if (windowsOnly.includes(id)) { extra.push('    windowsOnly: true,'); stats.win++ }
  if (guiOnly.includes(id)) { extra.push('    guiOnly: true,'); stats.gui++ }
  if (extra.length > 0) stats.touched++
  return extra
}

for (const line of lines) {
  const idMatch = /^ {4}id: '([a-z0-9_.-]+)',\r?$/.exec(line)
  if (idMatch) {
    pending = keysFor(idMatch[1])
  } else if (pending.length > 0 && /^ {4}defaultChecked: /.test(line)) {
    // on insere AVANT defaultChecked pour respecter l'ordre des cles de l'interface
    out.push(...pending)
    pending = []
  }
  out.push(line)
}

fs.writeFileSync(path, out.join(eol), 'utf-8')
console.log(JSON.stringify(stats))
