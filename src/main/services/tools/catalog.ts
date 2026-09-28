export type ToolCategory = 'recon' | 'enumer' | 'fuzz' | 'network' | 'utility' | 'ai'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  source: 'winget' | 'github' | 'git'
  wingetId?: string
  githubRepo?: string
  githubAsset?: string
  defaultChecked: boolean
}

export const TOOL_CATALOG: ToolDefinition[] = [
  {
    id: 'nmap',
    name: 'Nmap',
    description: 'Scan réseau et détection de services, scripts NSE',
    category: 'network',
    source: 'winget',
    wingetId: 'Insecure.Nmap',
    defaultChecked: true
  },
  {
    id: 'wireshark',
    name: 'Wireshark',
    description: 'Analyse de trafic réseau (pcap, protocoles)',
    category: 'network',
    source: 'winget',
    wingetId: 'WiresharkFoundation.Wireshark',
    defaultChecked: false
  },
  {
    id: 'nuclei',
    name: 'Nuclei',
    description: 'Scanner de vulnérabilités par templates (ProjectDiscovery)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/nuclei',
    githubAsset: 'windows_amd64',
    defaultChecked: true
  },
  {
    id: 'subfinder',
    name: 'Subfinder',
    description: 'Découverte de sous-domaines passifs',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/subfinder',
    githubAsset: 'windows_amd64',
    defaultChecked: true
  },
  {
    id: 'httpx',
    name: 'httpx',
    description: 'Probing HTTP : titres, status, technologies, fingerprints',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/httpx',
    githubAsset: 'windows_amd64',
    defaultChecked: true
  },
  {
    id: 'katana',
    name: 'Katana',
    description: 'Crawler web de ProjectDiscovery (simple et headless)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/katana',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'naabu',
    name: 'Naabu',
    description: 'Découverte de ports rapide (ProjectDiscovery)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/naabu',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'dnsx',
    name: 'dnsx',
    description: 'Boîte à outils DNS pour l’énumération (ProjectDiscovery)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/dnsx',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'asnmap',
    name: 'asnmap',
    description: 'Mapping ASN/organisation → plages IP (ProjectDiscovery)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/asnmap',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'uncover',
    name: 'uncover',
    description: 'Recherche de services via les moteurs Shodan/Censys/Fofa',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/uncover',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'alterx',
    name: 'alterx',
    description: 'Génération de permutations de sous-domaines (ProjectDiscovery)',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/alterx',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'amass',
    name: 'Amass',
    description: 'Énumération de sous-domaines OWASP (passive + actif)',
    category: 'recon',
    source: 'github',
    githubRepo: 'OWASP/amass',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'aquatone',
    name: 'Aquatone',
    description: 'Capture de screenshots à grande échelle + visualisation',
    category: 'recon',
    source: 'github',
    githubRepo: 'michenriksen/aquatone',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'waybackurls',
    name: 'waybackurls',
    description: 'Extrait les URLs de l’archive Wayback Machine',
    category: 'recon',
    source: 'github',
    githubRepo: 'tomnomnom/waybackurls',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'ffuf',
    name: 'ffuf',
    description: 'Fuzzing web : répertoires, paramètres, vhosts',
    category: 'fuzz',
    source: 'winget',
    wingetId: 'ffuf.ffuf',
    defaultChecked: true
  },
  {
    id: 'gobuster',
    name: 'Gobuster',
    description: 'Bruteforce de répertoires, DNS et vhosts',
    category: 'fuzz',
    source: 'github',
    githubRepo: 'OJ/gobuster',
    githubAsset: 'windows-amd64',
    defaultChecked: true
  },
  {
    id: 'dalfox',
    name: 'dalfox',
    description: 'Scanner de XSS (paramètre, mutation, DOM)',
    category: 'fuzz',
    source: 'github',
    githubRepo: 'hahwul/dalfox',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'interactsh-client',
    name: 'interactsh-client',
    description: 'Client OAST interactsh (détection d’appels sortants, SSRF, blind)',
    category: 'network',
    source: 'github',
    githubRepo: 'projectdiscovery/interactsh',
    githubAsset: 'windows_amd64',
    defaultChecked: false
  },
  {
    id: 'jq',
    name: 'jq',
    description: 'Manipulation JSON dans le terminal',
    category: 'utility',
    source: 'winget',
    wingetId: 'jqlang.jq',
    defaultChecked: false
  },
  {
    id: 'ripgrep',
    name: 'ripgrep',
    description: 'Recherche de motifs ultra rapide dans les fichiers',
    category: 'utility',
    source: 'winget',
    wingetId: 'BurntSushi.ripgrep.GNU',
    defaultChecked: false
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Versioning et clonage de wordlists/templates',
    category: 'utility',
    source: 'winget',
    wingetId: 'Git.Git',
    defaultChecked: false
  },
  {
    id: 'python',
    name: 'Python 3.12',
    description: 'Runtime pour vos scripts d’analyse',
    category: 'utility',
    source: 'winget',
    wingetId: 'Python.Python.3.12',
    defaultChecked: false
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Runtime Go : permet de `go install` les petits outils de la communauté',
    category: 'utility',
    source: 'winget',
    wingetId: 'GoLang.Go',
    defaultChecked: false
  },
  {
    id: 'node',
    name: 'Node.js LTS',
    description: 'Runtime JavaScript pour vos scripts d’analyse',
    category: 'utility',
    source: 'winget',
    wingetId: 'OpenJS.NodeJS.LTS',
    defaultChecked: false
  },
  {
    id: 'yq',
    name: 'yq',
    description: 'Manipulation YAML (analogue à jq)',
    category: 'utility',
    source: 'winget',
    wingetId: 'MikeFarah.yq',
    defaultChecked: false
  },
  {
    id: 'gitleaks',
    name: 'gitleaks',
    description: 'Détection de secrets dans un dépôt git',
    category: 'utility',
    source: 'github',
    githubRepo: 'gitleaks/gitleaks',
    githubAsset: 'windows_x64',
    defaultChecked: false
  },
  {
    id: 'seclists',
    name: 'SecLists',
    description: 'Wordlists (chemins, sous-domaines, paramètres…) utilisées par ffuf et les scans “Élevé”. Clone uniquement, aucune exécution.',
    category: 'utility',
    source: 'git',
    githubRepo: 'danielmiessler/SecLists',
    defaultChecked: false
  },
  {
    id: 'ai-hunter',
    name: 'BugHunter AI (Claude Code)',
    description:
      'Framework de chasse autonome : agents Claude Code, orchestration par machine à états, Burp MCP. Clone dans `userData/tools`, à activer ensuite dans Claude Code (voir le guide).',
    category: 'ai',
    source: 'git',
    githubRepo: 'h4ckologic/bughunter-ai',
    defaultChecked: false
  }
]

export function getTool(id: string): ToolDefinition | undefined {
  return TOOL_CATALOG.find((t) => t.id === id)
}

export type ToolInstallationResult = { ok: true; installed: boolean } | { ok: false; error: string }