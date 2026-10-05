export type Locale = 'en' | 'id';

export type Theme = 'dark' | 'light';

export type PlatformId = 'macos' | 'linux' | 'windows' | 'nodejs';

export interface CommandSnippet {
  readonly label: string;
  readonly command: string;
  readonly packageManager?: string;
}

export interface PlatformConfig {
  readonly id: PlatformId;
  readonly name: string;
  readonly snippets: readonly CommandSnippet[];
}

export interface ShowcaseTab {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly image: {
    readonly src: string;
    readonly srcSet: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
}

export interface FeatureCard {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly iconName: string;
  readonly technicalDetail: string;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface PageMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly ogLocale: 'en_US' | 'id_ID';
  readonly ogAlternateLocale: 'id_ID' | 'en_US';
  readonly ogImage: string;
  readonly twitterImage: string;
}

export interface Dictionary {
  readonly meta: PageMetadata;
  readonly nav: {
    readonly showcase: string;
    readonly features: string;
    readonly install: string;
    readonly faq: string;
    readonly github: string;
    readonly languageToggleAria: string;
    readonly themeToggleAria: string;
    readonly menuOpenAria: string;
    readonly menuCloseAria: string;
  };
  readonly hero: {
    readonly badge: string;
    readonly title: string;
    readonly highlight: string;
    readonly subtitle: string;
    readonly installCta: string;
    readonly githubCta: string;
  };
  readonly showcase: {
    readonly sectionTitle: string;
    readonly sectionSubtitle: string;
    readonly tabs: readonly ShowcaseTab[];
  };
  readonly features: {
    readonly sectionTitle: string;
    readonly sectionSubtitle: string;
    readonly cards: readonly FeatureCard[];
  };
  readonly quickstart: {
    readonly sectionTitle: string;
    readonly sectionSubtitle: string;
    readonly setupSteps: readonly string[];
    readonly platforms: readonly PlatformConfig[];
    readonly copiedNotification: string;
    readonly copyButtonAria: string;
  };
  readonly faq: {
    readonly sectionTitle: string;
    readonly sectionSubtitle: string;
    readonly items: readonly FaqItem[];
  };
  readonly footer: {
    readonly copyright: string;
    readonly license: string;
    readonly docsLink: string;
    readonly issuesLink: string;
    readonly communityLink: string;
  };
}
