import type { Dictionary } from '../../types';

export const dictionary: Dictionary = {
  meta: {
    title: '9Drive - Personal Cloud Storage & Universal API Gateway',
    description: 'Self-hosted personal cloud storage and universal API gateway pooling multiple Google Drive accounts with local-first streaming and zero telemetry.',
    canonicalUrl: 'https://9drive.dev/en',
    ogLocale: 'en_US',
    ogAlternateLocale: 'id_ID',
    ogImage: 'https://9drive.dev/og-image.png',
    twitterImage: 'https://9drive.dev/og-image.png',
  },
  nav: {
    showcase: 'Showcase',
    features: 'Features',
    install: 'Install',
    faq: 'FAQ',
    github: 'GitHub',
    languageToggleAria: 'Switch language',
    themeToggleAria: 'Toggle color scheme',
    menuOpenAria: 'Open navigation menu',
    menuCloseAria: 'Close navigation menu',
  },
  hero: {
    badge: '9Drive v1.0 • Self-Hosted Google Drive Alternative',
    title: 'Your Personal Cloud Storage,',
    highlight: 'Deployed in Seconds.',
    subtitle: 'Aggregate multiple Google Drive accounts into a unified, high-performance personal cloud with local-first caching, CDN streaming, and S3-compatible gateway access.',
    installCta: 'Install CLI',
    githubCta: 'View on GitHub',
  },
  showcase: {
    sectionTitle: 'Familiar Interface, Complete Privacy',
    sectionSubtitle: 'Experience the clean Material Design 3 workspace running entirely on your local machine.',
    tabs: [
      {
        id: 'web-ui',
        title: 'Web Dashboard',
        caption: 'Google Drive Material Design 3 interface running on localhost:8080.',
        image: {
          src: '/showcase/dashboard.webp',
          srcSet: '/showcase/dashboard.webp 1x, /showcase/dashboard@2x.webp 2x',
          alt: '9Drive Web Dashboard running locally on localhost showing Google Drive Material Design interface with folders and file list',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'file-explorer',
        title: 'File Explorer',
        caption: 'Effortless navigation, breadcrumbs, search, and context actions.',
        image: {
          src: '/showcase/files.webp',
          srcSet: '/showcase/files.webp 1x, /showcase/files@2x.webp 2x',
          alt: '9Drive file explorer grid view displaying file thumbnail previews and Material Design folder cards',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'cli-terminal',
        title: 'CLI Daemon',
        caption: 'Single binary startup with automatic background synchronization.',
        image: {
          src: '/showcase/terminal.webp',
          srcSet: '/showcase/terminal.webp 1x, /showcase/terminal@2x.webp 2x',
          alt: 'Terminal window showing 9drive CLI startup process, health checks, and local web server initialization',
          width: 1920,
          height: 1200,
        },
      },
      {
        id: 'storage-details',
        title: 'Storage Inspector',
        caption: 'Track pooled quota breakdown and file metadata with zero tracking.',
        image: {
          src: '/showcase/storage.webp',
          srcSet: '/showcase/storage.webp 1x, /showcase/storage@2x.webp 2x',
          alt: '9Drive sidebar storage indicator and file details inspector panel showing size, type, and modified dates',
          width: 1920,
          height: 1200,
        },
      },
    ],
  },
  features: {
    sectionTitle: 'Architected for Scale and Independence',
    sectionSubtitle: 'Engineered from the ground up to solve cloud storage fragmentation.',
    cards: [
      {
        id: 'pooling',
        title: 'Multi-Account Pooling',
        summary: 'Aggregate multiple Google accounts into a single contiguous storage pool with smart quota balancing.',
        iconName: 'Layers',
        technicalDetail: 'Virtual block-level allocation distributing files based on real-time account capacity.',
      },
      {
        id: 'local-first',
        title: 'Local-First Bundle',
        summary: 'Full offline availability with embedded SQLite catalog and background sync daemon.',
        iconName: 'Database',
        technicalDetail: 'Content-addressable staging cache ensuring uninterrupted read/write performance.',
      },
      {
        id: 'cdn-streaming',
        title: 'CDN Streaming',
        summary: 'High-throughput media streaming bypassing rate limits with edge range caching.',
        iconName: 'Zap',
        technicalDetail: 'Chunked HTTP range proxy optimized for large video and archive retrieval.',
      },
      {
        id: 'universal-gateway',
        title: 'Universal API Gateway',
        summary: 'Connect client applications via S3, WebDAV, or standard REST APIs.',
        iconName: 'Network',
        technicalDetail: 'Multi-protocol adapter layer converting third-party client calls into pooled Drive actions.',
      },
    ],
  },
  quickstart: {
    sectionTitle: 'Install in Seconds',
    sectionSubtitle: 'Zero complex setup. Choose your platform and run the one-line installer.',
    setupSteps: [
      'Install the standalone 9Drive binary or package.',
      'Authenticate your Google Drive accounts securely.',
      'Launch the local daemon and open the dashboard.',
    ],
    platforms: [
      {
        id: 'macos',
        name: 'macOS',
        snippets: [
          { label: 'Homebrew', command: 'brew install 9drive' },
          { label: 'Shell Script', command: 'curl -fsSL https://9drive.dev/install.sh | bash' },
        ],
      },
      {
        id: 'linux',
        name: 'Linux',
        snippets: [
          { label: 'Shell Script', command: 'curl -fsSL https://9drive.dev/install.sh | bash' },
          { label: 'Standalone Binary', command: 'curl -fsSL https://9drive.dev/dl/linux-x64.tar.gz | tar -xz && sudo mv 9drive /usr/local/bin/' },
        ],
      },
      {
        id: 'windows',
        name: 'Windows',
        snippets: [
          { label: 'PowerShell', command: 'irm https://9drive.dev/install.ps1 | iex' },
          { label: 'Winget', command: 'winget install 9drive' },
        ],
      },
      {
        id: 'nodejs',
        name: 'Node.js',
        snippets: [
          { label: 'npm', command: 'npm install -g 9drive', packageManager: 'npm' },
        ],
      },
    ],
    copiedNotification: 'Copied to clipboard!',
    copyButtonAria: 'Copy command to clipboard',
  },
  faq: {
    sectionTitle: 'Frequently Asked Questions',
    sectionSubtitle: 'Everything you need to know about 9Drive privacy, storage quotas, and security.',
    items: [
      {
        id: 'how-pooling-works',
        question: 'How does multi-account pooling work?',
        answer: '9Drive securely interfaces with Google Drive APIs across multiple authenticated Google accounts. The virtual pool automatically distributes files and chunked data across your accounts to maximize total free storage while avoiding quota ceilings.',
      },
      {
        id: 'security-privacy',
        question: 'Are my credentials and files secure?',
        answer: 'Yes. OAuth credentials and tokens remain encrypted and stored strictly on your local device. 9Drive collects zero telemetry, logs no personal data, and directly streams files without routing through intermediary third-party servers.',
      },
      {
        id: 'google-quotas',
        question: 'Will Google Drive API rate limits affect streaming?',
        answer: '9Drive incorporates local-first disk buffering and chunked range caching to minimize direct API requests, preventing quota starvation during continuous audio/video playback.',
      },
      {
        id: 'open-source',
        question: 'Is 9Drive open source?',
        answer: 'Yes. 9Drive is licensed under the MIT License and developed openly on GitHub. You have full freedom to audit, self-host, and modify the source code.',
      },
    ],
  },
  footer: {
    copyright: '© 2026 9Drive. All rights reserved.',
    license: 'Released under the MIT License.',
    docsLink: 'https://docs.9drive.dev',
    issuesLink: 'https://github.com/ninedrive/9drive/issues',
    communityLink: 'https://github.com/ninedrive/9drive/discussions',
  },
};
