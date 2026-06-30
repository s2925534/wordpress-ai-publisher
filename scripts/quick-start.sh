#!/usr/bin/env bash
set -euo pipefail

detect_pm() {
  if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1 && pnpm --version >/dev/null 2>&1; then
    echo "pnpm"
    return
  fi
  if [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1 && yarn --version >/dev/null 2>&1; then
    echo "yarn"
    return
  fi
  echo "npm"
}

run_pm() {
  local pm="$1"
  shift
  case "$pm" in
    pnpm) pnpm "$@" ;;
    yarn) yarn "$@" ;;
    npm) npm "$@" ;;
  esac
}

ensure_env_file() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  node - "$key" "$value" <<'NODE'
const fs = require('node:fs');
const key = process.argv[2];
const value = process.argv[3];
const filePath = '.env';
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let updated = false;
const next = lines.map((line) => {
  if (line.startsWith(`${key}=`)) {
    updated = true;
    return `${key}=${value}`;
  }
  return line;
});
if (!updated) {
  next.push(`${key}=${value}`);
}
fs.writeFileSync(filePath, next.join('\n').replace(/\n+$/, '\n'));
NODE
}

ensure_value_exists() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" .env; then
    set_env_value "$key" "$value"
    return
  fi
  local current
  current="$(grep "^${key}=" .env | head -n 1 | cut -d= -f2-)"
  if [[ -z "$current" || "$current" == replace-with-* ]]; then
    set_env_value "$key" "$value"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

pm="$(detect_pm)"

ensure_env_file

app_secret="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
encryption_key="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
ensure_value_exists APP_SECRET "$app_secret"
ensure_value_exists APP_ENCRYPTION_KEY "$encryption_key"
ensure_value_exists CONFIG_DIR "./config"
ensure_value_exists DEFAULT_SITE_KEY "default-site"
ensure_value_exists DEFAULT_CONTENT_PROFILE_KEY "linkedin-blog-package"

cp .env apps/web/.env

mkdir -p config/sites config/content-profiles

if [[ ! -d node_modules ]]; then
  run_pm "$pm" install
fi

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const siteConfigPath = path.resolve('config/sites/default-site.json');
const profilePath = path.resolve('config/content-profiles/linkedin-blog-package.json');
const siteUrl = 'https://example.com';
const hostname = new URL(siteUrl).hostname;
const siteName =
  hostname
    .replace(/^www\./i, '')
    .split('.')[0]
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Default Site';

const siteConfig = {
  siteKey: 'default-site',
  siteName,
  siteUrl,
  wordpress: {
    defaultStatus: 'draft',
    allowPublish: false,
    allowSchedule: true,
    allowCategoryCreation: true,
    allowTagCreation: true,
    preferExistingCategories: true,
    preferExistingTags: true
  },
  plugin: {
    routeNamespace: 'publisher/v1',
    requiresToken: true
  },
  brand: {
    displayName: siteName,
    positioning: 'A professional WordPress publishing site.',
    audiences: ['professionals', 'technical readers', 'business readers'],
    preferredTone: ['professional', 'clear', 'credible', 'practical'],
    avoidTone: ['hype', 'clickbait', 'robotic wording', 'generic corporate jargon']
  },
  contentPackage: {
    outputOrder: [
      'Title',
      'LinkedIn Post',
      'Excerpt',
      'Plain CSV Tags',
      'Recommended Categories',
      'Feature Image',
      'Alt Text',
      'Suggested Image File Name'
    ],
    maxCharacters: 8000,
    linkedinPostMustEndWithHashtags: true
  },
  hashtags: {
    alwaysInclude: [],
    preferred: [
      '#SoftwareEngineering',
      '#SoftwareArchitecture',
      '#ArtificialIntelligence',
      '#PlatformEngineering',
      '#CloudInfrastructure',
      '#DistributedSystems',
      '#Interoperability',
      '#DevSecOps',
      '#WorkflowAutomation',
      '#EngineeringLeadership',
      '#CyberSecurity',
      '#TechnologyStrategy',
      '#DeveloperTools'
    ],
    maxHashtags: 12
  },
  tags: {
    alwaysConsider: [],
    preferred: [
      'software engineering',
      'software architecture',
      'interoperability',
      'distributed systems',
      'platform engineering',
      'cloud infrastructure',
      'workflow automation',
      'developer tools',
      'engineering leadership',
      'technology strategy'
    ],
    minTags: 5,
    maxTags: 12
  },
  categories: {
    mode: 'discover_live_first',
    fallbackCategories: [],
    avoidUnlessExplicit: ['Uncategorized'],
    allowSuggestedNewCategory: true,
    requireConfirmationBeforeCreate: true
  },
  seo: {
    generateSeoTitle: true,
    generateMetaDescription: true,
    generatePrimaryKeyword: true,
    generateSecondaryKeywords: true,
    generateSlug: true,
    titleTargetLength: {
      min: 45,
      max: 65
    },
    metaDescriptionTargetLength: {
      min: 140,
      max: 160
    },
    avoidKeywordStuffing: true,
    suggestInternalLinks: true
  },
  image: {
    generateFeatureImage: true,
    requireAltText: true,
    allowNoImage: true,
    style: ['professional', 'modern', 'technology-oriented', 'meaningful', 'visually strong'],
    avoid: [
      'generic stock-photo style',
      'excessive blue unless requested',
      'overcrowded diagrams',
      'text-heavy graphics unless requested'
    ],
    filenameFormat: 'lowercase-hyphenated'
  },
  urlRules: {
    allowSiteUrlMentions: [],
    doNotMentionAsUrl: []
  },
  jetpack: {
    enabled: true,
    socialSharingOptional: true,
    continueIfUnavailable: true
  }
};

const contentProfile = {
  profileKey: 'linkedin-blog-package',
  name: 'LinkedIn + WordPress Blog Package',
  description: 'Generates a LinkedIn-ready post and WordPress-ready publication package.',
  outputOrder: [
    'Title',
    'LinkedIn Post',
    'Excerpt',
    'Plain CSV Tags',
    'Recommended Categories',
    'Feature Image',
    'Alt Text',
    'Suggested Image File Name'
  ],
  writingStyle: {
    prefer: ['technically mature', 'practical', 'credible', 'specific', 'professionally structured'],
    avoid: ['robotic AI wording', 'shallow motivation', 'excessive hype', 'generic corporate jargon', 'clickbait']
  },
  sections: {
    title: {
      required: true,
      seoFriendly: true
    },
    linkedinPost: {
      required: true,
      shortParagraphs: true,
      mustEndWithHashtags: true
    },
    excerpt: {
      required: true,
      maxParagraphs: 3
    },
    plainCsvTags: {
      required: true,
      noHashtags: true
    },
    recommendedCategories: {
      required: true,
      useSiteCategories: true
    },
    featureImage: {
      required: false,
      generatePrompt: true,
      generateImage: true
    },
    altText: {
      requiredWhenImageExists: true
    },
    suggestedImageFileName: {
      requiredWhenImageExists: true,
      format: 'lowercase-hyphenated'
    }
  }
};

if (!fs.existsSync(siteConfigPath)) {
  fs.writeFileSync(siteConfigPath, `${JSON.stringify(siteConfig, null, 2)}\n`);
}

if (!fs.existsSync(profilePath)) {
  fs.writeFileSync(profilePath, `${JSON.stringify(contentProfile, null, 2)}\n`);
}
NODE

run_pm "$pm" run prisma:generate
run_pm "$pm" run prisma:migrate
run_pm "$pm" run prisma:seed
run_pm "$pm" run config:validate
./scripts/package-wordpress-plugin.sh || true

echo "Setup complete."
echo
echo "Open the app:"
echo "http://localhost:3000"
echo
echo "Next steps inside the app:"
echo
echo "1. Go to Settings -> AI Provider"
echo "   Add your OpenAI API key."
echo
echo "2. Go to Settings -> WordPress Site"
echo "   Set the protocol, hostname, and timezone."
echo "   Add your WordPress username."
echo "   Add your WordPress Application Password."
echo "   Download the JSON backup after configuring."
echo
echo "3. Go to Settings -> WordPress Plugin"
echo "   Download the plugin zip from the app."
echo "   Install the plugin in WordPress."
echo "   Paste the plugin token only if you want plugin-backed discovery."
echo
echo "4. Go to Settings -> Content Profile"
echo "   Review preferred tags, hashtags, tone, image style, and SEO rules."
echo
echo "5. Go to Settings -> Site Discovery"
echo "   Run site discovery to retrieve categories, tags, authors, media support, and Jetpack Social status."
echo
echo "6. Create your first draft."
echo
run_pm "$pm" --workspace apps/web run dev
