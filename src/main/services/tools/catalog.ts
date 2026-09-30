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
  detectCmd?: string
  /** Fragment de nom d'asset pour la cible Linux (par défaut githubAsset). */
  githubAssetLinux?: string
  /** Nom réel du binaire dans l'archive quand il diffère de l'id. */
  exeName?: string
  /** Paquet Debian/Ubuntu pour installer cet outil sous Linux. */
  aptPackage?: string
  /** Le gestionnaire de paquets de la plateforme est requis (apt, winget...). */
  needsPackageManager?: boolean
  /** Outil sans équivalent hors Windows (Sysinternals, PowerToys...). */
  windowsOnly?: boolean
  /** Application graphique : installation hors périmètre d'un utilitaire CLI. */
  guiOnly?: boolean
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
    aptPackage: 'nmap',
    defaultChecked: true
  },
  {
    id: 'wireshark',
    name: 'Wireshark',
    description: 'Analyse de trafic réseau (pcap, protocoles)',
    category: 'network',
    source: 'winget',
    wingetId: 'WiresharkFoundation.Wireshark',
    aptPackage: 'wireshark',
    detectCmd: 'tshark',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
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
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'waybackurls',
    name: 'waybackurls',
    description: 'Extrait les URLs de l’archive Wayback Machine',
    category: 'recon',
    source: 'github',
    githubRepo: 'tomnomnom/waybackurls',
    githubAsset: 'windows-amd64',
    githubAssetLinux: 'linux-amd64',
    defaultChecked: false
  },
  {
    id: 'tlsx',
    name: 'tlsx',
    description: 'Collecte TLS : certificats, SNI, versions, jarm',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/tlsx',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'chaos',
    name: 'Chaos',
    description: 'Fuzzing et résolution DNS via les datasets ProjectDiscovery',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/chaos-client',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    exeName: 'chaos-client',
    defaultChecked: false
  },
  {
    id: 'mapcidr',
    name: 'mapcidr',
    description: 'Conversion et manipulation de plages CIDR / IP',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/mapcidr',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'cdncheck',
    name: 'cdncheck',
    description: 'Détection des CDN et WAF connus sur une cible',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/cdncheck',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'urlfinder',
    name: 'urlfinder',
    description: 'Découverte rapide d’URLs sur un domaine',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/urlfinder',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'shuffledns',
    name: 'shuffledns',
    description: 'Résolution DNS massive avec bruteforce de sous-domaines',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/shuffledns',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'cloudlist',
    name: 'cloudlist',
    description: 'Liste des domaines hébergés chez les fournisseurs cloud',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/cloudlist',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'gau',
    name: 'gau',
    description: 'Récupère les URL archivées (Wayback, Common Crawl, AlienVault)',
    category: 'recon',
    source: 'github',
    githubRepo: 'lc/gau',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'cariddi',
    name: 'cariddi',
    description: 'Crawl de masse : endpoints, secrets, tokens, extensions',
    category: 'recon',
    source: 'github',
    githubRepo: 'edoardottt/cariddi',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'httprobe',
    name: 'httprobe',
    description: 'Sonde HTTP : statut, titres, technologies, favicon hash',
    category: 'recon',
    source: 'github',
    githubRepo: 'tomnomnom/httprobe',
    githubAsset: 'windows-amd64',
    githubAssetLinux: 'linux-amd64',
    defaultChecked: false
  },
  {
    id: 'unfurl',
    name: 'unfurl',
    description: 'Extrait et normalise les données d’une URL',
    category: 'recon',
    source: 'github',
    githubRepo: 'tomnomnom/unfurl',
    githubAsset: 'windows-amd64',
    githubAssetLinux: 'linux-amd64',
    defaultChecked: false
  },
  {
    id: 'findomain',
    name: 'Findomain',
    description: 'Découverte de sous-domaines multi-source, active et passive',
    category: 'recon',
    source: 'github',
    githubRepo: 'findomain/findomain',
    githubAsset: 'findomain-windows',
    githubAssetLinux: 'findomain-linux.zip',
    defaultChecked: false
  },
  {
    id: 'puredns',
    name: 'puredns',
    description: 'Résolution DNS massive via resolvers publics et tranco',
    category: 'recon',
    source: 'git',
    githubRepo: 'd3mondev/puredns',
    defaultChecked: false
  },
  {
    id: 'github-subdomains',
    name: 'GitHub Subdomains',
    description: 'Trouve des sous-domaines dans le code source public GitHub',
    category: 'recon',
    source: 'git',
    githubRepo: 'gwen001/github-subdomains',
    defaultChecked: false
  },
  {
    id: 'github-endpoints',
    name: 'GitHub Endpoints',
    description: 'Détecte les endpoints exposés dans les dépôts GitHub',
    category: 'recon',
    source: 'git',
    githubRepo: 'gwen001/github-endpoints',
    defaultChecked: false
  },
  {
    id: 'gauplus',
    name: 'gauplus',
    description: 'Wrapper de gau avec vérification des URLs via Check-Host',
    category: 'recon',
    source: 'git',
    githubRepo: 'bp0lr/gauplus',
    defaultChecked: false
  },
  {
    id: 'theharvester',
    name: 'theHarvester',
    description: 'OSINT : sous-domaines, adresses e-mail, noms, hôtes',
    category: 'recon',
    source: 'git',
    githubRepo: 'laramies/theHarvester',
    defaultChecked: false
  },
  {
    id: 'sublist3r',
    name: 'Sublist3r',
    description: 'Énumération de sous-domaines via plusieurs sources',
    category: 'recon',
    source: 'git',
    githubRepo: 'aboul3la/Sublist3r',
    defaultChecked: false
  },
  {
    id: 'oneforall',
    name: 'OneForAll',
    description: 'OSINT mono-outil : sous-domaines, e-mails, IRC, repositories',
    category: 'recon',
    source: 'git',
    githubRepo: 'shmilylty/OneForAll',
    defaultChecked: false
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    description: 'Recherche de comptes existants à partir d’un pseudo',
    category: 'recon',
    source: 'git',
    githubRepo: 'sherlock-project/sherlock',
    defaultChecked: false
  },
  {
    id: 'maigret',
    name: 'Maigret',
    description: 'OSINT : présence d’un identifiant sur des dizaines de réseaux',
    category: 'recon',
    source: 'git',
    githubRepo: 'soxoj/maigret',
    defaultChecked: false
  },
  {
    id: 'ghunt',
    name: 'GHunt',
    description: 'Enquête OSINT sur un compte Google : e-mails, clés, services',
    category: 'recon',
    source: 'git',
    githubRepo: 'mxrch/GHunt',
    defaultChecked: false
  },
  {
    id: 'osintgram',
    name: 'Osintgram',
    description: 'Modules OSINT ciblés sur un compte Instagram',
    category: 'recon',
    source: 'git',
    githubRepo: 'Datalux/Osintgram',
    defaultChecked: false
  },
  {
    id: 'recon-ng',
    name: 'recon-ng',
    description: 'Framework de reconnaissance modulaire et orienté OSINT',
    category: 'recon',
    source: 'git',
    githubRepo: 'lanmaster53/recon-ng',
    defaultChecked: false
  },
  {
    id: 'reconftw',
    name: 'reconFTW',
    description: 'Orchestrateur de reconnaissance OSINT de bout en bout',
    category: 'recon',
    source: 'git',
    githubRepo: 'six2dez/reconftw',
    defaultChecked: false
  },
  {
    id: 'spiderfoot',
    name: 'SpiderFoot',
    description: 'Footprinting et collecte OSINT automatisée multilingue',
    category: 'recon',
    source: 'git',
    githubRepo: 'smicallef/spiderfoot',
    defaultChecked: false
  },
  {
    id: 'wafw00f',
    name: 'wafw00f',
    description: 'Identifie les pare-feu applicatifs devant une cible',
    category: 'recon',
    source: 'git',
    githubRepo: 'EnableSecurity/wafw00f',
    defaultChecked: false
  },
  {
    id: 'whatweb',
    name: 'WhatWeb',
    description: 'Fingerprint de sites : CMS, frameworks, libs, emails',
    category: 'recon',
    source: 'git',
    githubRepo: 'urbanadventurer/WhatWeb',
    defaultChecked: false
  },
  {
    id: 'paramspider',
    name: 'ParamSpider',
    description: 'Découvre les paramètres d’URL à partir des journaux de recherche',
    category: 'recon',
    source: 'git',
    githubRepo: 'devanshbatham/ParamSpider',
    defaultChecked: false
  },
  {
    id: 'gospider',
    name: 'gospider',
    description: 'Crawler web rapide en Go (endpoints, JS, formulaires)',
    category: 'recon',
    source: 'git',
    githubRepo: 'jaeles-project/gospider',
    defaultChecked: false
  },
  {
    id: 'jsluice',
    name: 'jsluice',
    description: 'Extrait URLs, chemins et secrets depuis des fichiers JavaScript',
    category: 'recon',
    source: 'git',
    githubRepo: 'BishopFox/jsluice',
    defaultChecked: false
  },
  {
    id: 'cloud-enum',
    name: 'cloud_enum',
    description: 'Énumère les ressources publiques AWS, Azure et Google Cloud',
    category: 'recon',
    source: 'git',
    githubRepo: 'initstring/cloud_enum',
    defaultChecked: false
  },
  {
    id: 's3scanner',
    name: 'S3Scanner',
    description: 'Cherche des buckets S3 mal configurés sur les API compatibles',
    category: 'recon',
    source: 'git',
    githubRepo: 'Sa7mon/S3Scanner',
    defaultChecked: false
  },
  {
    id: 'linkfinder',
    name: 'LinkFinder',
    description: 'Extrait endpoints et secrets des fichiers JavaScript et CSS',
    category: 'recon',
    source: 'git',
    githubRepo: 'GerbenJavado/LinkFinder',
    defaultChecked: false
  },
  {
    id: 'secretfinder',
    name: 'SecretFinder',
    description: 'Trouve des secrets dans les pages web et les archives ZIP',
    category: 'recon',
    source: 'git',
    githubRepo: 'm4ll0k/SecretFinder',
    defaultChecked: false
  },
  {
    id: 'hakrawler',
    name: 'hakrawler',
    description: 'Crawler OSINT : e-mails, comptes, dépôts, usernames',
    category: 'recon',
    source: 'git',
    githubRepo: 'hakluke/hakrawler',
    defaultChecked: false
  },
  {
    id: 'hakrevdns',
    name: 'hakrevdns',
    description: 'Enregistrement d’cran pour la preuve d’une reproduction',
    category: 'recon',
    source: 'git',
    githubRepo: 'hakluke/hakrevdns',
    defaultChecked: false
  },
  {
    id: 'hakoriginfinder',
    name: 'hakoriginfinder',
    description: 'Trouve adresses e-mail et noms avec des dorks OSINT',
    category: 'recon',
    source: 'git',
    githubRepo: 'hakluke/hakoriginfinder',
    defaultChecked: false
  },
  {
    id: 'hakcheckurl',
    name: 'hakcheckurl',
    description: 'Vérifie le statut HTTP et les redirections d’une liste d’URL',
    category: 'recon',
    source: 'git',
    githubRepo: 'hakluke/hakcheckurl',
    defaultChecked: false
  },
  {
    id: 'haktrails',
    name: 'haktrails',
    description: 'Historique des sous-domaines via l’API SecurityTrails',
    category: 'recon',
    source: 'git',
    githubRepo: 'hakluke/haktrails',
    defaultChecked: false
  },
  {
    id: 'assetfinder',
    name: 'assetfinder',
    description: 'Sous-domaines et IPs extraits de l’historique GitHub',
    category: 'recon',
    source: 'git',
    githubRepo: 'tomnomnom/assetfinder',
    defaultChecked: false
  },
  {
    id: 'onelistforall',
    name: 'OneListForAll',
    description: 'Génère des listes de sous-domaines depuis plusieurs sources',
    category: 'recon',
    source: 'git',
    githubRepo: 'six2dez/OneListForAll',
    defaultChecked: false
  },
  {
    id: 'bbot',
    name: 'BBOT',
    description: 'Scanner OSINT récursif modulaire (Python)',
    category: 'recon',
    source: 'git',
    githubRepo: 'blacklanternsecurity/bbot',
    defaultChecked: false
  },
  {
    id: 'ffuf',
    name: 'ffuf',
    description: 'Fuzzing web : répertoires, paramètres, vhosts',
    category: 'fuzz',
    source: 'winget',
    wingetId: 'ffuf.ffuf',
    aptPackage: 'ffuf',
    defaultChecked: true
  },
  {
    id: 'gobuster',
    name: 'Gobuster',
    description: 'Bruteforce de répertoires, DNS et vhosts',
    category: 'fuzz',
    source: 'github',
    githubRepo: 'OJ/gobuster',
    githubAsset: 'windows_x86_64',
    githubAssetLinux: 'Linux_x86_64',
    defaultChecked: true
  },
  {
    id: 'dalfox',
    name: 'dalfox',
    description: 'Scanner de XSS (paramètre, mutation, DOM)',
    category: 'fuzz',
    source: 'github',
    githubRepo: 'hahwul/dalfox',
    githubAsset: 'windows-x86_64',
    githubAssetLinux: 'linux-x86_64.tar.gz',
    defaultChecked: false
  },
  {
    id: 'feroxbuster',
    name: 'feroxbuster',
    description: 'Bruteforce de répertoires rapide (Rust, multi-thread)',
    category: 'fuzz',
    source: 'github',
    githubRepo: 'epi052/feroxbuster',
    githubAsset: 'x86_64-windows-feroxbuster',
    githubAssetLinux: 'x86_64-linux-feroxbuster.zip',
    defaultChecked: false
  },
  {
    id: 'sqlmap',
    name: 'sqlmap',
    description: 'Détection et exploitation d’injections SQL',
    category: 'fuzz',
    source: 'git',
    githubRepo: 'sqlmapproject/sqlmap',
    defaultChecked: false
  },
  {
    id: 'dirsearch',
    name: 'dirsearch',
    description: 'Bruteforce web de répertoires (multi-thread, wordlists)',
    category: 'fuzz',
    source: 'git',
    githubRepo: 'maurosoria/dirsearch',
    defaultChecked: false
  },
  {
    id: 'arjun',
    name: 'Arjun',
    description: 'Découvre les paramètres cachés d’un endpoint',
    category: 'fuzz',
    source: 'git',
    githubRepo: 's0md3v/Arjun',
    defaultChecked: false
  },
  {
    id: 'xsstrike',
    name: 'XSStrike',
    description: 'Détection de XSS avec analyse de contexte et payloads',
    category: 'fuzz',
    source: 'git',
    githubRepo: 's0md3v/XSStrike',
    defaultChecked: false
  },
  {
    id: 'commix',
    name: 'commix',
    description: 'Fuzzer d’injections (SQL, NoSQL, LDAP, OS command…)',
    category: 'fuzz',
    source: 'git',
    githubRepo: 'commixproject/commix',
    defaultChecked: false
  },
  {
    id: 'nosqlmap',
    name: 'NoSQLMap',
    description: 'Fuzzer d’injections pour bases de données NoSQL',
    category: 'fuzz',
    source: 'git',
    githubRepo: 'codingo/NoSQLMap',
    defaultChecked: false
  },
  {
    id: 'jaeles',
    name: 'jaeles',
    description: 'Fuzzing de requêtes piloté par des signatures JSON',
    category: 'fuzz',
    source: 'git',
    githubRepo: 'jaeles-project/jaeles',
    defaultChecked: false
  },
  {
    id: 'nikto',
    name: 'Nikto',
    description: 'Scanner web de vulnérabilités et configurations par défaut',
    category: 'enumer',
    source: 'git',
    githubRepo: 'sullo/nikto',
    defaultChecked: false
  },
  {
    id: 'interlace',
    name: 'Interlace',
    description: 'Automatise des commandes sur un ensemble de cibles',
    category: 'enumer',
    source: 'git',
    githubRepo: 'codingo/Interlace',
    defaultChecked: false
  },
  {
    id: 'wpscan',
    name: 'WPScan',
    description: 'Énumération de WordPress : thèmes, plugins, failles connues',
    category: 'enumer',
    source: 'git',
    githubRepo: 'wpscanteam/wpscan',
    defaultChecked: false
  },
  {
    id: 'cmsseek',
    name: 'CMSeek',
    description: 'Détection et analyse de 180+ CMS (WordPress, Joomla, Drupal…)',
    category: 'enumer',
    source: 'git',
    githubRepo: 'Tuhinshubhra/CMSeek',
    defaultChecked: false
  },
  {
    id: 'joomscan',
    name: 'joomscan',
    description: 'Scanner de vulnérabilités Joomla (OWASP)',
    category: 'enumer',
    source: 'git',
    githubRepo: 'OWASP/joomscan',
    defaultChecked: false
  },
  {
    id: 'droopescan',
    name: 'Droopescan',
    description: 'Énumération de modules et de thèmes Drupal vulnérables',
    category: 'enumer',
    source: 'git',
    githubRepo: 'SamJoan/droopescan',
    defaultChecked: false
  },
  {
    id: 'wapiti',
    name: 'Wapiti',
    description: 'Scanner web de vulnérabilités (rapports, crawl, OWASP)',
    category: 'enumer',
    source: 'git',
    githubRepo: 'wapiti-scanner/wapiti',
    defaultChecked: false
  },
  {
    id: 'openvas-scanner',
    name: 'OpenVAS Scanner',
    description: 'Moteur de scan de vulnérabilités (Greenbone)',
    category: 'enumer',
    source: 'git',
    githubRepo: 'greenbone/openvas-scanner',
    defaultChecked: false
  },
  {
    id: 'zaproxy',
    name: 'OWASP ZAP (source)',
    description: 'Code source du proxy ZAP (DAST), à installer via la Community Edition',
    category: 'enumer',
    source: 'git',
    githubRepo: 'zaproxy/zaproxy',
    defaultChecked: false
  },
  {
    id: 'interactsh-client',
    name: 'interactsh-client',
    description: 'Client OAST interactsh (détection d’appels sortants, SSRF, blind)',
    category: 'network',
    source: 'github',
    githubRepo: 'projectdiscovery/interactsh',
    githubAsset: 'client',
    defaultChecked: false
  },
  {
    id: 'notify',
    name: 'notify',
    description: 'Notifications OAST vers Discord, Slack, Telegram ou webhook',
    category: 'network',
    source: 'github',
    githubRepo: 'projectdiscovery/notify',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'simplehttpserver',
    name: 'simplehttpserver',
    description: 'Serveur HTTP local pour canary tokens et tests OAST',
    category: 'network',
    source: 'github',
    githubRepo: 'projectdiscovery/simplehttpserver',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'pdtm',
    name: 'pdtm',
    description: 'Proxy qui tente les ports et mots de passe détectés par un scan',
    category: 'network',
    source: 'github',
    githubRepo: 'projectdiscovery/pdtm',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'chisel',
    name: 'chisel',
    description: 'Tunnel TCP/UDP chiffré pour pivoter dans un réseau interne',
    category: 'network',
    source: 'github',
    githubRepo: 'jpillora/chisel',
    githubAsset: 'windows_amd64',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'bettercap',
    name: 'bettercap',
    description: 'Attaques réseau : MITM, spoofing, Wi-Fi, poisoning',
    category: 'network',
    source: 'github',
    githubRepo: 'bettercap/bettercap',
    githubAsset: 'bettercap_windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'rustscan',
    name: 'rustscan',
    description: 'Scanner de ports TCP ultra rapide (pivoter ensuite avec nmap)',
    category: 'network',
    source: 'github',
    githubRepo: 'RustScan/RustScan',
    githubAsset: 'x86_64-windows-rustscan',
    githubAssetLinux: 'x86_64-linux-rustscan.tar.gz.zip',
    defaultChecked: false
  },
  {
    id: 'nmap-source',
    name: 'Nmap (source)',
    description: 'Code source de Nmap, pour compiler une version personnalisée',
    category: 'network',
    source: 'git',
    githubRepo: 'nmap/nmap',
    defaultChecked: false
  },
  {
    id: 'zmap',
    name: 'ZMap',
    description: 'Scanner de masse mono-paquet pour des surveys à grande échelle',
    category: 'network',
    source: 'git',
    githubRepo: 'zmap/zmap',
    defaultChecked: false
  },
  {
    id: 'zgrab2',
    name: 'zgrab2',
    description: 'Scanner de la couche application au-dessus de ZMap',
    category: 'network',
    source: 'git',
    githubRepo: 'zmap/zgrab2',
    defaultChecked: false
  },
  {
    id: 'masscan',
    name: 'masscan',
    description: 'Scanner de ports asynchrone, très rapide sur de grandes plages',
    category: 'network',
    source: 'git',
    githubRepo: 'robertdavidgraham/masscan',
    defaultChecked: false
  },
  {
    id: 'scapy',
    name: 'Scapy',
    description: 'Manipulation de paquets et scripting réseau en Python',
    category: 'network',
    source: 'git',
    githubRepo: 'SECDEV/scapy',
    defaultChecked: false
  },
  {
    id: 'tcpdump',
    name: 'tcpdump',
    description: 'Capture et filtre de trafic réseau en ligne de commande',
    category: 'network',
    source: 'git',
    githubRepo: 'the-tcpdump-group/tcpdump',
    defaultChecked: false
  },
  {
    id: 'ngrep',
    name: 'ngrep',
    description: 'grep appliqué à la couche réseau sur des captures pcap',
    category: 'network',
    source: 'git',
    githubRepo: 'jpr5/ngrep',
    defaultChecked: false
  },
  {
    id: 'ntopng',
    name: 'ntopng',
    description: 'Monitoring du trafic réseau via interface web',
    category: 'network',
    source: 'git',
    githubRepo: 'ntop/ntopng',
    defaultChecked: false
  },
  {
    id: 'zeek',
    name: 'Zeek',
    description: 'Framework d’analyse réseau qui génère des journaux (conn logs)',
    category: 'network',
    source: 'git',
    githubRepo: 'zeek/zeek',
    defaultChecked: false
  },
  {
    id: 'suricata',
    name: 'Suricata',
    description: 'Détection d’intrusion réseau IDS/IPS et moteur de règles',
    category: 'network',
    source: 'git',
    githubRepo: 'OISF/suricata',
    defaultChecked: false
  },
  {
    id: 'arkime',
    name: 'Arkime',
    description: 'Capture complète de paquets indexée et consultable dans le web',
    category: 'network',
    source: 'git',
    githubRepo: 'arkime/arkime',
    defaultChecked: false
  },
  {
    id: 'frp',
    name: 'frp',
    description: 'Reverse proxy pour exposer un service local derrière un NAT',
    category: 'network',
    source: 'git',
    githubRepo: 'fatedier/frp',
    defaultChecked: false
  },
  {
    id: 'gost',
    name: 'gost',
    description: 'Tunnel multi-protocole simple et flexible (TCP, UDP, HTTP, QUIC)',
    category: 'network',
    source: 'git',
    githubRepo: 'go-gost/gost',
    defaultChecked: false
  },
  {
    id: 'nps',
    name: 'nps',
    description: 'Serveur de tunnel d’intranet (TCP, UDP, HTTP, SOCKS5) avec panel web',
    category: 'network',
    source: 'git',
    githubRepo: 'ehang-io/nps',
    defaultChecked: false
  },
  {
    id: 'mitmproxy',
    name: 'mitmproxy',
    description: 'Proxy interactif avec scriptable flows HTTP/HTTPS',
    category: 'network',
    source: 'git',
    githubRepo: 'mitmproxy/mitmproxy',
    defaultChecked: false
  },
  {
    id: 'http-toolkit',
    name: 'HTTP Toolkit',
    description: 'Proxy et intercepteur HTTP(S) avec interface graphique, multi-plateforme',
    category: 'network',
    source: 'git',
    githubRepo: 'httptoolkit/httptoolkit',
    defaultChecked: false
  },
  {
    id: 'impacket',
    name: 'impacket',
    description: 'Classes et scripts Python pour AD, SMB, NTLM, Kerberos',
    category: 'network',
    source: 'git',
    githubRepo: 'fortra/impacket',
    defaultChecked: false
  },
  {
    id: 'responder',
    name: 'Responder',
    description: 'Poisoning LLMNR, NBT-NS, mDNS et WPAD',
    category: 'network',
    source: 'git',
    githubRepo: 'lgandx/Responder',
    defaultChecked: false
  },
  {
    id: 'evil-winrm',
    name: 'Evil-WinRM',
    description: 'Connexion WinRM distante et exécution de commandes (pentest Windows)',
    category: 'network',
    source: 'git',
    githubRepo: 'Hackplayers/evil-winrm',
    defaultChecked: false
  },
  {
    id: 'nishang',
    name: 'Nishang',
    description: 'Scripts PowerShell offensifs et reverse shells',
    category: 'network',
    source: 'git',
    githubRepo: 'samratashok/nishang',
    defaultChecked: false
  },
  {
    id: 'empire',
    name: 'Empire',
    description: 'Framework C2 et post-exploitation PowerShell',
    category: 'network',
    source: 'git',
    githubRepo: 'BC-SECURITY/Empire',
    defaultChecked: false
  },
  {
    id: 'powersploit',
    name: 'PowerSploit',
    description: 'Modules PowerShell de post-exploitation et d’énumération',
    category: 'network',
    source: 'git',
    githubRepo: 'PowerShellMafia/PowerSploit',
    defaultChecked: false
  },
  {
    id: 'seatbelt',
    name: 'Seatbelt',
    description: 'Collecte d’énumération système et post-exploitation (Rust)',
    category: 'network',
    source: 'git',
    githubRepo: 'GhostPack/Seatbelt',
    defaultChecked: false
  },
  {
    id: 'rubeus',
    name: 'Rubeus',
    description: 'Manipulation Kerberos : roast, AS-REP, ticket forgery',
    category: 'network',
    source: 'git',
    githubRepo: 'GhostPack/Rubeus',
    defaultChecked: false
  },
  {
    id: 'bloodhound',
    name: 'BloodHound',
    description: 'Cartographie des relations et droits dans Active Directory',
    category: 'network',
    source: 'git',
    githubRepo: 'BloodHoundAD/BloodHound',
    defaultChecked: false
  },
  {
    id: 'sharphound',
    name: 'SharpHound',
    description: 'Collecteur de données AD pour BloodHound (C#)',
    category: 'network',
    source: 'git',
    githubRepo: 'BloodHoundAD/SharpHound',
    defaultChecked: false
  },
  {
    id: 'mimikatz',
    name: 'mimikatz',
    description: 'Extraction de credentials, tickets et hashes Windows en mémoire',
    category: 'network',
    source: 'git',
    githubRepo: 'gentilkiwi/mimikatz',
    defaultChecked: false
  },
  {
    id: 'petitpotam',
    name: 'PetitPotam',
    description: 'Coerce une authentification Windows distante via MS-EFSRPC',
    category: 'network',
    source: 'git',
    githubRepo: 'topotam/PetitPotam',
    defaultChecked: false
  },
  {
    id: 'printspoofer',
    name: 'PrintSpoofer',
    description: 'Abus de privilèges d’impersonation via le spooler d’impression',
    category: 'network',
    source: 'git',
    githubRepo: 'itm4n/PrintSpoofer',
    defaultChecked: false
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    description: 'Contourne les restrictions PowerShell et injecte du shellcode',
    category: 'network',
    source: 'git',
    githubRepo: 'trustedsec/unicorn',
    defaultChecked: false
  },
  {
    id: 'sliver',
    name: 'Sliver',
    description: 'Framework d’émulation d’adversaire et C2 (Go)',
    category: 'network',
    source: 'git',
    githubRepo: 'BishopFox/sliver',
    defaultChecked: false
  },
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    description: 'DFIR, hunting et réponse à incident (endpoints, VFS)',
    category: 'network',
    source: 'git',
    githubRepo: 'Velocidex/velociraptor',
    defaultChecked: false
  },
  {
    id: 'jq',
    name: 'jq',
    description: 'Manipulation JSON dans le terminal',
    category: 'utility',
    source: 'winget',
    wingetId: 'jqlang.jq',
    aptPackage: 'jq',
    defaultChecked: false
  },
  {
    id: 'ripgrep',
    name: 'ripgrep',
    description: 'Recherche de motifs ultra rapide dans les fichiers',
    category: 'utility',
    source: 'winget',
    wingetId: 'BurntSushi.ripgrep.GNU',
    aptPackage: 'ripgrep',
    detectCmd: 'rg',
    defaultChecked: false
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Versioning et clonage de wordlists/templates',
    category: 'utility',
    source: 'winget',
    wingetId: 'Git.Git',
    aptPackage: 'git',
    defaultChecked: false
  },
  {
    id: 'python',
    name: 'Python 3.12',
    description: 'Runtime pour vos scripts d’analyse',
    category: 'utility',
    source: 'winget',
    wingetId: 'Python.Python.3.12',
    aptPackage: 'python3-minimal',
    detectCmd: 'python3',
    defaultChecked: false
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Runtime Go : permet de `go install` les petits outils de la communauté',
    category: 'utility',
    source: 'winget',
    wingetId: 'GoLang.Go',
    aptPackage: 'golang-go',
    defaultChecked: false
  },
  {
    id: 'node',
    name: 'Node.js LTS',
    description: 'Runtime JavaScript pour vos scripts d’analyse',
    category: 'utility',
    source: 'winget',
    wingetId: 'OpenJS.NodeJS.LTS',
    aptPackage: 'nodejs',
    defaultChecked: false
  },
  {
    id: 'yq',
    name: 'yq',
    description: 'Manipulation YAML (analogue à jq)',
    category: 'utility',
    source: 'winget',
    wingetId: 'MikeFarah.yq',
    detectCmd: 'yq',
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
    githubAssetLinux: 'linux_x64',
    defaultChecked: false
  },
  {
    id: 'trufflehog',
    name: 'trufflehog',
    description: 'Détection de secrets, y compris dans l’historique git',
    category: 'utility',
    source: 'github',
    githubRepo: 'trufflesecurity/trufflehog',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  },
  {
    id: 'noseyparker',
    name: 'Nosey Parker',
    description: 'Trouve secrets et données sensibles dans fichiers et historiques git',
    category: 'utility',
    source: 'git',
    githubRepo: 'praetorian-inc/noseyparker',
    defaultChecked: false
  },
  {
    id: 'meg',
    name: 'meg',
    description: 'Fuzzing massif de sous-domaines (chaînes alphanumériques)',
    category: 'utility',
    source: 'github',
    githubRepo: 'tomnomnom/meg',
    githubAsset: 'windows-amd64',
    githubAssetLinux: 'linux-amd64',
    defaultChecked: false
  },
  {
    id: 'qsreplace',
    name: 'qsreplace',
    description: 'Remplace les valeurs de requête et de cookie dans un fichier Burp',
    category: 'utility',
    source: 'github',
    githubRepo: 'tomnomnom/qsreplace',
    githubAsset: 'windows-amd64',
    githubAssetLinux: 'linux-amd64',
    defaultChecked: false
  },
  {
    id: 'gf',
    name: 'gf',
    description: 'Patterns grep pour tokens, XSS, SQLi, LFI et plus',
    category: 'utility',
    source: 'git',
    githubRepo: 'tomnomnom/gf',
    defaultChecked: false
  },
  {
    id: 'fff',
    name: 'fff',
    description: 'Trouve rapidement les fichiers volumineux dans une arborescence',
    category: 'utility',
    source: 'git',
    githubRepo: 'tomnomnom/fff',
    defaultChecked: false
  },
  {
    id: 'radare2',
    name: 'radare2',
    description: 'Framework de reverse engineering et désassemblage',
    category: 'utility',
    source: 'git',
    githubRepo: 'radareorg/radare2',
    defaultChecked: false
  },
  {
    id: 'hashcat',
    name: 'hashcat',
    description: 'Récupération de mots de passe par hachage, multi-GPU',
    category: 'utility',
    source: 'git',
    githubRepo: 'hashcat/hashcat',
    defaultChecked: false
  },
  {
    id: 'john',
    name: 'John the Ripper',
    description: 'Cassage de mots de passe hors ligne, jumbo',
    category: 'utility',
    source: 'git',
    githubRepo: 'openwall/john',
    defaultChecked: false
  },
  {
    id: 'volatility',
    name: 'Volatility 2',
    description: 'Framework de forensique mémoire (volatility 2.x)',
    category: 'utility',
    source: 'git',
    githubRepo: 'volatilityfoundation/volatility',
    defaultChecked: false
  },
  {
    id: 'volatility3',
    name: 'Volatility 3',
    description: 'Framework de forensique mémoire (volatility 3.x)',
    category: 'utility',
    source: 'git',
    githubRepo: 'volatilityfoundation/volatility3',
    defaultChecked: false
  },
  {
    id: 'timesketch',
    name: 'Timesketch',
    description: 'Analyse collaborative de timelines forensiques',
    category: 'utility',
    source: 'git',
    githubRepo: 'google/timesketch',
    defaultChecked: false
  },
  {
    id: 'assemblyline',
    name: 'AssemblyLine',
    description: 'Triage de fichiers et analyse de malware à grande échelle',
    category: 'utility',
    source: 'git',
    githubRepo: 'cybercentrecanada/assemblyline',
    defaultChecked: false
  },
  {
    id: 'yara',
    name: 'YARA',
    description: 'Identification de fichiers et de familles de malware par motifs',
    category: 'utility',
    source: 'git',
    githubRepo: 'VirusTotal/yara',
    defaultChecked: false
  },
  {
    id: 'clamav',
    name: 'ClamAV',
    description: 'Antivirus open source et moteur de scan de signatures',
    category: 'utility',
    source: 'git',
    githubRepo: 'Cisco-Talos/clamav',
    defaultChecked: false
  },
  {
    id: 'capa',
    name: 'capa',
    description: 'Identifie les capacités d’un binaire suspect (mandiant FLARE)',
    category: 'utility',
    source: 'git',
    githubRepo: 'mandiant/capa',
    defaultChecked: false
  },
  {
    id: 'ptf',
    name: 'PTF',
    description: 'Penetration Testers Framework : outillage modulaire',
    category: 'utility',
    source: 'git',
    githubRepo: 'trustedsec/ptf',
    defaultChecked: false
  },
  {
    id: 'osv-scanner',
    name: 'OSV-Scanner',
    description: 'Scan de vulnérabilités des dépendances via la base osv.dev',
    category: 'utility',
    source: 'git',
    githubRepo: 'google/osv-scanner',
    defaultChecked: false
  },
  {
    id: 'pip-audit',
    name: 'pip-audit',
    description: 'Audit des dépendances Python et de leurs vulnérabilités connues',
    category: 'utility',
    source: 'git',
    githubRepo: 'pypa/pip-audit',
    defaultChecked: false
  },
  {
    id: 'retirejs',
    name: 'Retire.js',
    description: 'Détecte les bibliothèques JavaScript vulnérables et génère un SBOM',
    category: 'utility',
    source: 'git',
    githubRepo: 'RetireJS/retire.js',
    defaultChecked: false
  },
  {
    id: 'dependency-check',
    name: 'OWASP Dependency-Check',
    description: 'Analyse SCA des dépendances (Java, .NET, Node, Python…)',
    category: 'utility',
    source: 'git',
    githubRepo: 'jeremylong/DependencyCheck',
    defaultChecked: false
  },
  {
    id: 'capev2',
    name: 'CAPEv2',
    description: 'Sandbox d’analyse de malware avec extraction de configuration',
    category: 'utility',
    source: 'git',
    githubRepo: 'kevoreilly/CAPEv2',
    defaultChecked: false
  },
  {
    id: 'misp',
    name: 'MISP',
    description: 'Plateforme de renseignement sur les menaces et de partage d’IO',
    category: 'utility',
    source: 'git',
    githubRepo: 'MISP/MISP',
    defaultChecked: false
  },
  {
    id: 'opencti',
    name: 'OpenCTI',
    description: 'Plateforme de renseignement cyber (graph de connaissance)',
    category: 'utility',
    source: 'git',
    githubRepo: 'OpenCTI-Platform/opencti',
    defaultChecked: false
  },
  {
    id: 'yeti',
    name: 'Yeti',
    description: 'Collecte et corrélation de renseignement sur les menaces',
    category: 'utility',
    source: 'git',
    githubRepo: 'yeti-platform/yeti',
    defaultChecked: false
  },
  {
    id: 'mitre-attack',
    name: 'MITRE ATT&CK (STIX)',
    description: 'Données STIX de la matrice MITRE ATT&CK',
    category: 'utility',
    source: 'git',
    githubRepo: 'mitre-attack/attack-stix-data',
    defaultChecked: false
  },
  {
    id: 'mitre-cti',
    name: 'MISP cti',
    description: 'Dépôt STIX 2.0 de renseignement sur les menaces',
    category: 'utility',
    source: 'git',
    githubRepo: 'mitre/cti',
    defaultChecked: false
  },
  {
    id: 'owasp-cheatsheets',
    name: 'OWASP Cheat Sheet Series',
    description: 'Guides de sécurisation par technologie, en Markdown',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/CheatSheetSeries',
    defaultChecked: false
  },
  {
    id: 'owasp-asvs',
    name: 'OWASP ASVS',
    description: 'Standard de vérification de sécurité applicative',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/ASVS',
    defaultChecked: false
  },
  {
    id: 'owasp-wstg',
    name: 'OWASP WSTG',
    description: 'Guide de test de sécurité des applications web',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/wstg',
    defaultChecked: false
  },
  {
    id: 'owasp-mastg',
    name: 'OWASP MASTG',
    description: 'Guide de test et de reverse engineering mobile',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/owasp-mstg',
    defaultChecked: false
  },
  {
    id: 'owasp-top10',
    name: 'OWASP Top 10',
    description: 'Documentation et retours d’expérience sur le Top 10',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/www-project-top-ten',
    defaultChecked: false
  },
  {
    id: 'owasp-nettacker',
    name: 'OWASP Nettacker',
    description: 'Recon automatisée multi-protocole avec scoring de surface',
    category: 'utility',
    source: 'git',
    githubRepo: 'OWASP/Nettacker',
    defaultChecked: false
  },
  {
    id: 'nuclei-templates',
    name: 'nuclei-templates',
    description: 'Templates communautaires pour nuclei (sont415 uniquement)',
    category: 'utility',
    source: 'git',
    githubRepo: 'projectdiscovery/nuclei-templates',
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
    id: 'payloads-all-things',
    name: 'PayloadsAllTheThings',
    description: 'Payloads, wordlists et bypass pour tests d’intrusion',
    category: 'utility',
    source: 'git',
    githubRepo: 'swisskyrepo/PayloadsAllTheThings',
    defaultChecked: false
  },
  {
    id: 'assetnote-wordlists',
    name: 'Assetnote Wordlists',
    description: 'Wordlists curationnées orientées sous-domaines et API',
    category: 'utility',
    source: 'git',
    githubRepo: 'assetnote/wordlists',
    defaultChecked: false
  },
  {
    id: 'fuzzdb',
    name: 'fuzzdb',
    description: 'Base de payloads et wordlists pour le fuzzing web',
    category: 'utility',
    source: 'git',
    githubRepo: 'fuzzdb-project/fuzzdb',
    defaultChecked: false
  },
  {
    id: 'fuzz-txt',
    name: 'fuzz.txt',
    description: 'Liste de fichiers et extensions dangereux à tester',
    category: 'utility',
    source: 'git',
    githubRepo: 'Bo0oM/fuzz.txt',
    defaultChecked: false
  },
  {
    id: 'syft',
    name: 'Syft',
    description: 'Génère un SBOM depuis les images et répertoires',
    category: 'utility',
    source: 'winget',
    wingetId: 'Anchore.Syft',
    detectCmd: 'syft',
    defaultChecked: false
  },
  {
    id: 'grype',
    name: 'Grype',
    description: 'Scan de vulnérabilités à partir d’un SBOM ou d’une image',
    category: 'utility',
    source: 'winget',
    wingetId: 'Anchore.Grype',
    detectCmd: 'grype',
    defaultChecked: false
  },
  {
    id: 'trivy',
    name: 'Trivy',
    description: 'Scanner de vulnérabilités (images, FS, dépendances, IaC)',
    category: 'utility',
    source: 'winget',
    wingetId: 'AquaSecurity.Trivy',
    detectCmd: 'trivy',
    defaultChecked: false
  },
  {
    id: '7zip',
    name: '7-Zip',
    description: 'Compression et extraction d’archives',
    category: 'utility',
    source: 'winget',
    wingetId: '7zip.7zip',
    aptPackage: '7zip',
    detectCmd: '7z',
    defaultChecked: false
  },
  {
    id: 'bat',
    name: 'bat',
    description: 'cat avec coloration syntaxique et en-têtes Git',
    category: 'utility',
    source: 'winget',
    wingetId: 'sharkdp.bat',
    aptPackage: 'bat',
    detectCmd: 'batcat',
    defaultChecked: false
  },
  {
    id: 'fd',
    name: 'fd',
    description: 'find moderne et rapide, avec expressions régulières',
    category: 'utility',
    source: 'winget',
    wingetId: 'sharkdp.fd',
    aptPackage: 'fd-find',
    detectCmd: 'fdfind',
    defaultChecked: false
  },
  {
    id: 'fzf',
    name: 'fzf',
    description: 'Recherche interactive et floue dans vos listes',
    category: 'utility',
    source: 'winget',
    wingetId: 'junegunn.fzf',
    aptPackage: 'fzf',
    defaultChecked: false
  },
  {
    id: 'delta',
    name: 'delta',
    description: 'Diff syntaxiquement coloré pour git',
    category: 'utility',
    source: 'winget',
    wingetId: 'dandavison.delta',
    aptPackage: 'git-delta',
    defaultChecked: false
  },
  {
    id: 'eza',
    name: 'eza',
    description: 'ls moderne (icônes, arbre, git, colonnes)',
    category: 'utility',
    source: 'winget',
    wingetId: 'eza-community.eza',
    aptPackage: 'eza',
    defaultChecked: false
  },
  {
    id: 'hyperfine',
    name: 'hyperfine',
    description: 'Mesure de performance de commandes',
    category: 'utility',
    source: 'winget',
    wingetId: 'sharkdp.hyperfine',
    aptPackage: 'hyperfine',
    defaultChecked: false
  },
  {
    id: 'everything',
    name: 'Everything',
    description: 'Recherche instantanée de fichiers sous Windows',
    category: 'utility',
    source: 'winget',
    wingetId: 'voidtools.Everything',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'powertoys',
    name: 'PowerToys',
    description: 'Suite d’utilitaires Windows (FancyZones, Run, Peek…)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.PowerToys',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'autohotkey',
    name: 'AutoHotkey',
    description: 'Automatisation de tâches et scripts clavier/souris',
    category: 'utility',
    source: 'winget',
    wingetId: 'AutoHotkey.AutoHotkey',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'terminal',
    name: 'Windows Terminal',
    description: 'Terminal moderne (profils, onglets, transparence)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.WindowsTerminal',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'alacritty',
    name: 'Alacritty',
    description: 'Terminal GPU, très rapide et minimaliste',
    category: 'utility',
    source: 'winget',
    wingetId: 'Alacritty.Alacritty',
    aptPackage: 'alacritty',
    defaultChecked: false
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    description: 'Éditeur de code et débogage',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.VisualStudioCode',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'vscodium',
    name: 'VSCodium',
    description: 'VS Code sans télémétrie',
    category: 'utility',
    source: 'winget',
    wingetId: 'VSCodium.VSCodium',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'neovim',
    name: 'Neovim',
    description: 'Éditeur de texte modulaire orienté terminal',
    category: 'utility',
    source: 'winget',
    wingetId: 'Neovim.Neovim',
    aptPackage: 'neovim',
    detectCmd: 'nvim',
    defaultChecked: false
  },
  {
    id: 'notepadplusplus',
    name: 'Notepad++',
    description: 'Éditeur léger avec plugins et navigation par onglets',
    category: 'utility',
    source: 'winget',
    wingetId: 'Notepad++.Notepad++',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'procexp',
    name: 'Process Explorer',
    description: 'Gestionnaire de tâches avancé (Sysinternals), handles et DLLs',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.ProcessExplorer',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'procmon',
    name: 'Process Monitor',
    description: 'Trace système de fichiers, registre et processus (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.ProcessMonitor',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'autoruns',
    name: 'Autoruns',
    description: 'Inspecte et nettoie les points de persistance (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.Autoruns',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'handle',
    name: 'Handle',
    description: 'Liste les handles ouverts d’un processus (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.Handle',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'sigcheck',
    name: 'Sigcheck',
    description: 'Vérifie les signatures numériques des exécutables (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.Sigcheck',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'rammap',
    name: 'RAMMap',
    description: 'Analyse l’usage mémoire et le cache système (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.RAMMap',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'whois',
    name: 'Whois',
    description: 'Recherche WHOIS depuis le terminal (Sysinternals)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.Sysinternals.Whois',
    aptPackage: 'whois',
    defaultChecked: false
  },
  {
    id: 'windirstat',
    name: 'WinDirStat',
    description: 'Visualise ce qui occupe l’espace disque',
    category: 'utility',
    source: 'winget',
    wingetId: 'WinDirStat.WinDirStat',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'python311',
    name: 'Python 3.11',
    description: 'Runtime Python alternatif (compatibilité des outils)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Python.Python.3.11',
    aptPackage: 'python3.11-minimal',
    detectCmd: 'python3.11',
    defaultChecked: false
  },
  {
    id: 'python310',
    name: 'Python 3.10',
    description: 'Runtime Python pour les scripts hérités',
    category: 'utility',
    source: 'winget',
    wingetId: 'Python.Python.3.10',
    detectCmd: 'python3.10',
    defaultChecked: false
  },
  {
    id: 'python313',
    name: 'Python 3.13',
    description: 'Runtime Python récent',
    category: 'utility',
    source: 'winget',
    wingetId: 'Python.Python.3.13',
    aptPackage: 'python3.13-minimal',
    detectCmd: 'python3.13',
    defaultChecked: false
  },
  {
    id: 'deno',
    name: 'Deno',
    description: 'Runtime TypeScript/JavaScript sécurisé',
    category: 'utility',
    source: 'winget',
    wingetId: 'DenoLand.Deno',
    detectCmd: 'deno',
    defaultChecked: false
  },
  {
    id: 'bun',
    name: 'Bun',
    description: 'Runtime et bundler JavaScript',
    category: 'utility',
    source: 'winget',
    wingetId: 'Oven-sh.Bun',
    detectCmd: 'bun',
    defaultChecked: false
  },
  {
    id: 'pnpm',
    name: 'pnpm',
    description: 'Gestionnaire de paquets Node (disques partagés)',
    category: 'utility',
    source: 'winget',
    wingetId: 'pnpm.pnpm',
    detectCmd: 'pnpm',
    defaultChecked: false
  },
  {
    id: 'yarn',
    name: 'Yarn',
    description: 'Gestionnaire de paquets Node (classique)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Yarn.Yarn',
    detectCmd: 'yarn',
    defaultChecked: false
  },
  {
    id: 'volta',
    name: 'Volta',
    description: 'Gestionnaire de versions Node par projet',
    category: 'utility',
    source: 'winget',
    wingetId: 'Volta.Volta',
    detectCmd: 'volta',
    defaultChecked: false
  },
  {
    id: 'uv',
    name: 'uv',
    description: 'Gestionnaire Python ultra rapide (venv et dépendances)',
    category: 'utility',
    source: 'winget',
    wingetId: 'astral-sh.uv',
    detectCmd: 'uv',
    defaultChecked: false
  },
  {
    id: 'rustup',
    name: 'Rustup',
    description: 'Toolchain Rust (cargo install d’outils maison)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Rustlang.Rustup',
    aptPackage: 'rustup',
    defaultChecked: false
  },
  {
    id: 'php',
    name: 'PHP 8.3',
    description: 'Runtime PHP (DVWA, WordPress local)',
    category: 'utility',
    source: 'winget',
    wingetId: 'PHP.PHP.8.3',
    defaultChecked: false
  },
  {
    id: 'ruby',
    name: 'Ruby 3.2',
    description: 'Runtime Ruby (Metasploit, outils community)',
    category: 'utility',
    source: 'winget',
    wingetId: 'RubyInstallerTeam.Ruby.3.2',
    aptPackage: 'ruby',
    defaultChecked: false
  },
  {
    id: 'openjdk21',
    name: 'OpenJDK 21',
    description: 'Runtime Java pour Burp, ZAP, jadx et outils de fuzzing',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.OpenJDK.21',
    aptPackage: 'openjdk-21-jre-headless',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'temurin21',
    name: 'Eclipse Temurin 21 JRE',
    description: 'Runtime Java alternatif (Temurin)',
    category: 'utility',
    source: 'winget',
    wingetId: 'EclipseAdoptium.Temurin.21.JRE',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'zulu21',
    name: 'Azul Zulu 21 JRE',
    description: 'Runtime Java alternatif (Zulu)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Azul.Zulu.21.JRE',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'openjdk17',
    name: 'OpenJDK 17',
    description: 'Runtime Java 17 (compatibilité outils plus anciens)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.OpenJDK.17',
    aptPackage: 'openjdk-17-jre-headless',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'temurin8',
    name: 'Eclipse Temurin 8 JRE',
    description: 'Runtime Java 8 (outils anciens, jadx, ysoserial)',
    category: 'utility',
    source: 'winget',
    wingetId: 'EclipseAdoptium.Temurin.8.JRE',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'zulu17',
    name: 'Azul Zulu 17 JRE',
    description: 'Runtime Java 17 (Zulu)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Azul.Zulu.17.JRE',
    detectCmd: 'java',
    defaultChecked: false
  },
  {
    id: 'dotnet-sdk8',
    name: '.NET SDK 8',
    description: 'SDK .NET (BloodHound, NetExec, outils C#)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.DotNet.SDK.8',
    defaultChecked: false
  },
  {
    id: 'dotnet-sdk9',
    name: '.NET SDK 9',
    description: 'SDK .NET récent',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.DotNet.SDK.9',
    defaultChecked: false
  },
  {
    id: 'dotnet-desktop8',
    name: '.NET Desktop Runtime 8',
    description: 'Runtime pour les applications WPF/WinForms de la suite .NET',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.DotNet.DesktopRuntime.8',
    defaultChecked: false
  },
  {
    id: 'dotnet6',
    name: '.NET Runtime 6',
    description: 'Runtime .NET 6 (compatibilité des anciens agents)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.DotNet.Runtime.6',
    detectCmd: 'dotnet',
    defaultChecked: false
  },
  {
    id: 'cmake',
    name: 'CMake',
    description: 'Système de build natif (C/C++, Rust C…)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Kitware.CMake',
    aptPackage: 'cmake',
    defaultChecked: false
  },
  {
    id: 'ninja',
    name: 'Ninja',
    description: 'Système de build rapide',
    category: 'utility',
    source: 'winget',
    wingetId: 'Ninja-build.Ninja',
    aptPackage: 'ninja-build',
    defaultChecked: false
  },
  {
    id: 'vs-buildtools',
    name: 'Visual Studio Build Tools',
    description: 'Compilateur MSVC et SDK Windows (nécessaire pour certains outils)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.VisualStudio.2022.BuildTools',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'gh',
    name: 'GitHub CLI',
    description: 'gh en ligne de commande (API, issues, repos)',
    category: 'utility',
    source: 'winget',
    wingetId: 'GitHub.cli',
    aptPackage: 'gh',
    defaultChecked: false
  },
  {
    id: 'github-desktop',
    name: 'GitHub Desktop',
    description: 'Client Git graphique',
    category: 'utility',
    source: 'winget',
    wingetId: 'GitHub.GitHubDesktop',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'tortoisegit',
    name: 'TortoiseGit',
    description: 'Client Git intégré à l’explorateur Windows',
    category: 'utility',
    source: 'winget',
    wingetId: 'TortoiseGit.TortoiseGit',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'putty',
    name: 'PuTTY',
    description: 'Client SSH et Telnet léger',
    category: 'utility',
    source: 'winget',
    wingetId: 'PuTTY.PuTTY',
    aptPackage: 'putty',
    defaultChecked: false
  },
  {
    id: 'sqlitesuite',
    name: 'SQLite',
    description: 'Client en ligne de commande pour bases SQLite',
    category: 'utility',
    source: 'winget',
    wingetId: 'SQLite.SQLite',
    aptPackage: 'sqlite3',
    detectCmd: 'sqlite3',
    defaultChecked: false
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Base de données clé-valeur en mémoire',
    category: 'utility',
    source: 'winget',
    wingetId: 'Redis.Redis',
    aptPackage: 'redis-tools',
    detectCmd: 'redis-cli',
    defaultChecked: false
  },
  {
    id: 'docker-desktop',
    name: 'Docker Desktop',
    description: 'Conteneurs Linux sur Windows (machines d’authentification, outils)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Docker.DockerDesktop',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'wsl',
    name: 'WSL',
    description: 'Sous-système Linux pour Windows (indispensable pour Kali)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.WSL',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'debian',
    name: 'Debian (WSL)',
    description: 'Distribution Debian pour WSL',
    category: 'utility',
    source: 'winget',
    wingetId: 'Debian.Debian',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'virtualbox',
    name: 'VirtualBox',
    description: 'Hyperviseur pour machines d’analyse (Windows, Linux, AD)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Oracle.VirtualBox',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'helm',
    name: 'Helm',
    description: 'Gestionnaire de charts Kubernetes',
    category: 'utility',
    source: 'winget',
    wingetId: 'Helm.Helm',
    detectCmd: 'helm',
    defaultChecked: false
  },
  {
    id: 'kubectl',
    name: 'kubectl',
    description: 'Client Kubernetes en ligne de commande',
    category: 'utility',
    source: 'winget',
    wingetId: 'Kubernetes.kubectl',
    aptPackage: 'kubectl',
    defaultChecked: false
  },
  {
    id: 'terraform',
    name: 'Terraform',
    description: 'Infrastructure as Code (revue de configs IaC)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Terraform',
    detectCmd: 'terraform',
    defaultChecked: false
  },
  {
    id: 'packer',
    name: 'Packer',
    description: 'Construction d’images machines (Vagrant, cloud)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Packer',
    detectCmd: 'packer',
    defaultChecked: false
  },
  {
    id: 'vagrant',
    name: 'Vagrant',
    description: 'Gestion de machines virtuelles reproductibles',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Vagrant',
    aptPackage: 'vagrant',
    defaultChecked: false
  },
  {
    id: 'consul',
    name: 'Consul',
    description: 'Service discovery et key/value store',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Consul',
    detectCmd: 'consul',
    defaultChecked: false
  },
  {
    id: 'nomad',
    name: 'Nomad',
    description: 'Orchestrateur de workloads (audit de clusters)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Nomad',
    detectCmd: 'nomad',
    defaultChecked: false
  },
  {
    id: 'vault',
    name: 'Vault',
    description: 'Gestion de secrets HashiCorp',
    category: 'utility',
    source: 'winget',
    wingetId: 'Hashicorp.Vault',
    detectCmd: 'vault',
    defaultChecked: false
  },
  {
    id: 'awscli',
    name: 'AWS CLI',
    description: 'Client AWS pour l’énumération cloud',
    category: 'utility',
    source: 'winget',
    wingetId: 'Amazon.AWSCLI',
    detectCmd: 'aws',
    defaultChecked: false
  },
  {
    id: 'azurecli',
    name: 'Azure CLI',
    description: 'Client Azure pour l’énumération cloud',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.AzureCLI',
    detectCmd: 'az',
    defaultChecked: false
  },
  {
    id: 'gcloud',
    name: 'Google Cloud SDK',
    description: 'Client gcloud pour l’énumération GCP',
    category: 'utility',
    source: 'winget',
    wingetId: 'Google.CloudSDK',
    detectCmd: 'gcloud',
    defaultChecked: false
  },
  {
    id: 'burpsuite',
    name: 'Burp Suite Community',
    description: 'Proxy d’interception et scanner web (reconnaissance, modification de requêtes)',
    category: 'recon',
    source: 'winget',
    wingetId: 'PortSwigger.BurpSuite.Community',
    guiOnly: true,
    defaultChecked: true
  },
  {
    id: 'zap',
    name: 'OWASP ZAP',
    description: 'Proxy d’interception et scanner DAST',
    category: 'recon',
    source: 'winget',
    wingetId: 'ZAP.ZAP',
    detectCmd: 'zap.sh',
    defaultChecked: false
  },
  {
    id: 'fiddler',
    name: 'Fiddler Classic',
    description: 'Proxy de capture HTTP/HTTPS avec scriptabilité',
    category: 'recon',
    source: 'winget',
    wingetId: 'Telerik.Fiddler.Classic',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'postman',
    name: 'Postman',
    description: 'Client et collection de requêtes API',
    category: 'recon',
    source: 'winget',
    wingetId: 'Postman.Postman',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'insomnia',
    name: 'Insomnia',
    description: 'Client REST/GraphQL, alternative légère à Postman',
    category: 'recon',
    source: 'winget',
    wingetId: 'Insomnia.Insomnia',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'bruno',
    name: 'Bruno',
    description: 'Client API, collections stockées en texte dans le dépôt',
    category: 'recon',
    source: 'winget',
    wingetId: 'Bruno.Bruno',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'termius',
    name: 'Termius',
    description: 'Client SSH multi-appareils avec gestion de clés',
    category: 'recon',
    source: 'winget',
    wingetId: 'Termius.Termius',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'browser-tor',
    name: 'Tor Browser',
    description: 'Navigateur anonymisé pour la validation hors-ligne',
    category: 'recon',
    source: 'winget',
    wingetId: 'TorProject.TorBrowser',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'firefox',
    name: 'Firefox',
    description: 'Navigateur avec outils de développement',
    category: 'recon',
    source: 'winget',
    wingetId: 'Mozilla.Firefox',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    description: 'Navigateur Chromium de référence pour tester sur Chrome',
    category: 'recon',
    source: 'winget',
    wingetId: 'Google.Chrome',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'brave',
    name: 'Brave',
    description: 'Navigateur Chromium avec bloqueurs intégrés',
    category: 'recon',
    source: 'winget',
    wingetId: 'Brave.Brave',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'librewolf',
    name: 'LibreWolf',
    description: 'Firefox durci, sans télémétrie',
    category: 'recon',
    source: 'winget',
    wingetId: 'LibreWolf.LibreWolf',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'openvpn',
    name: 'OpenVPN',
    description: 'Client VPN (pivoting, accès distant autorisé)',
    category: 'network',
    source: 'winget',
    wingetId: 'OpenVPNTechnologies.OpenVPN',
    aptPackage: 'openvpn',
    defaultChecked: false
  },
  {
    id: 'wireguard',
    name: 'WireGuard',
    description: 'Client VPN rapide et moderne',
    category: 'network',
    source: 'winget',
    wingetId: 'WireGuard.WireGuard',
    aptPackage: 'wireguard-tools',
    detectCmd: 'wg',
    defaultChecked: false
  },
  {
    id: 'warp',
    name: 'Cloudflare WARP',
    description: 'Client VPN chiffré de sortie',
    category: 'network',
    source: 'winget',
    wingetId: 'Cloudflare.Warp',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'tailscale',
    name: 'Tailscale',
    description: 'Overlay réseau mesh pour machines isolées',
    category: 'network',
    source: 'winget',
    wingetId: 'Tailscale.Tailscale',
    detectCmd: 'tailscale',
    defaultChecked: false
  },
  {
    id: 'anydesk',
    name: 'AnyDesk',
    description: 'Bureau distant (tests d’accès et de support)',
    category: 'network',
    source: 'winget',
    wingetId: 'AnyDesk.AnyDesk',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'teamviewer',
    name: 'TeamViewer',
    description: 'Bureau distant (tests d’accès et de support)',
    category: 'network',
    source: 'winget',
    wingetId: 'TeamViewer.TeamViewer',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'vncviewer',
    name: 'VNC Viewer',
    description: 'Client VNC (RealVNC) pour sessions graphiques',
    category: 'network',
    source: 'winget',
    wingetId: 'RealVNC.VNCViewer',
    aptPackage: 'tigervnc-viewer',
    detectCmd: 'xtigervncviewer',
    defaultChecked: false
  },
  {
    id: 'metasploit',
    name: 'Metasploit Framework',
    description:
      'Framework d’exploitation (modules, payloads, post-exploitation). Clone source uniquement : installez et lancez via l’installateur officiel Rapid7 sur Windows.',
    category: 'network',
    source: 'git',
    githubRepo: 'rapid7/metasploit-framework',
    defaultChecked: false
  },
  {
    id: 'heidisql',
    name: 'HeidiSQL',
    description: 'Client SQL multi-moteurs (MySQL, MariaDB, PostgreSQL…)',
    category: 'utility',
    source: 'winget',
    wingetId: 'HeidiSQL.HeidiSQL',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'drawio',
    name: 'diagrams.net',
    description: 'Outil de diagrammes (cartes d’attaque, schémas)',
    category: 'utility',
    source: 'winget',
    wingetId: 'JGraph.Draw',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Notes locales liées (rapports, playbooks)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Obsidian.Obsidian',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'bitwarden',
    name: 'Bitwarden',
    description: 'Gestionnaire de mots de passe (rotation de secrets)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Bitwarden.Bitwarden',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'obs-studio',
    name: 'OBS Studio',
    description: 'Enregistrement d’cran pour la preuve d’une reproduction',
    category: 'utility',
    source: 'winget',
    wingetId: 'OBSProject.OBSStudio',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg',
    description: 'Conversion audio/vidéo et capture d’écran',
    category: 'utility',
    source: 'winget',
    wingetId: 'Gyan.FFmpeg',
    aptPackage: 'ffmpeg',
    defaultChecked: false
  },
  {
    id: 'sumatrapdf',
    name: 'SumatraPDF',
    description: 'Lecteur PDF léger',
    category: 'utility',
    source: 'winget',
    wingetId: 'SumatraPDF.SumatraPDF',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'rufus',
    name: 'Rufus',
    description: 'Création de clés USB amorçables',
    category: 'utility',
    source: 'winget',
    wingetId: 'Rufus.Rufus',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'ventoy',
    name: 'Ventoy',
    description: 'Clé USB multi-images pour environments d’analyse',
    category: 'utility',
    source: 'winget',
    wingetId: 'Ventoy.Ventoy',
    detectCmd: 'Ventoy2Disk',
    defaultChecked: false
  },
  {
    id: 'crystaldiskinfo',
    name: 'CrystalDiskInfo',
    description: 'SMART et santé des disques',
    category: 'utility',
    source: 'winget',
    wingetId: 'CrystalDewWorld.CrystalDiskInfo',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'crystaldiskmark',
    name: 'CrystalDiskMark',
    description: 'Benchmark de débit disque',
    category: 'utility',
    source: 'winget',
    wingetId: 'CrystalDewWorld.CrystalDiskMark',
    windowsOnly: true,
    defaultChecked: false
  },
  {
    id: 'powershell',
    name: 'PowerShell 7',
    description: 'PowerShell moderne (cross-platform)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Microsoft.PowerShell',
    detectCmd: 'pwsh',
    defaultChecked: false
  },
  {
    id: 'intellij-idea',
    name: 'IntelliJ IDEA Community',
    description: 'IDE Java (analyse de code, plugins de sécurité)',
    category: 'utility',
    source: 'winget',
    wingetId: 'JetBrains.IntelliJIDEA.Community',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'pycharm',
    name: 'PyCharm Community',
    description: 'IDE Python (débogage de scripts OSINT)',
    category: 'utility',
    source: 'winget',
    wingetId: 'JetBrains.PyCharm.Community',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'rider',
    name: 'Rider',
    description: 'IDE .NET / C# (BloodHound, SharpHound)',
    category: 'utility',
    source: 'winget',
    wingetId: 'JetBrains.Rider',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Modèles de langage locaux (aide à l’analyse sans envoi de données)',
    category: 'ai',
    source: 'winget',
    wingetId: 'Ollama.Ollama',
    detectCmd: 'ollama',
    defaultChecked: false
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Client de discussion (suivi des programmes et de leurs changements)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Discord.Discord',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Client de discussion (suivi des programmes et de leurs changements)',
    category: 'utility',
    source: 'winget',
    wingetId: 'SlackTechnologies.Slack',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Visioconférence (entretiens de tri)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Zoom.Zoom',
    guiOnly: true,
    defaultChecked: false
  },
  {
    id: 'thunderbird',
    name: 'Thunderbird',
    description: 'Client e-mail (suivi des programmes)',
    category: 'utility',
    source: 'winget',
    wingetId: 'Mozilla.Thunderbird',
    guiOnly: true,
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
