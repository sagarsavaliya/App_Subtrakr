import 'dart:ui';

import '../../data/models/subscription_model.dart';
import 'app_colors.dart';

/// PRD S3-1 — pre-loaded service catalogue for add-subscription
/// autocomplete. Amount 0 = usage-based/variable (no prefill).
class ServiceEntry {
  const ServiceEntry(
    this.name,
    this.initials,
    this.category,
    this.defaultAmount,
    this.color, {
    this.cycle = BillingCycle.monthly,
  });

  final String name;
  final String initials;
  final SubscriptionCategory category;
  final double defaultAmount;
  final Color color;
  final BillingCycle cycle;
}

// Category fallback hues for services without a brand color.
const _dev = Color(0xFF60A5FA);
const _ent = Color(0xFFF472B6);
const _tel = Color(0xFF8B9BFF);
const _cloud = Color(0xFF38BDF8);
const _saas = Color(0xFF34D399);
const _util = Color(0xFFFBBF24);
const _store = Color(0xFFA78BFA);
const _sec = Color(0xFFF87171);
const _prod = Color(0xFF2DD4BF);

const serviceCatalogue = <ServiceEntry>[
  // ── Dev tools / AI ────────────────────────────────────────────────────
  ServiceEntry('Claude Pro', 'CL', SubscriptionCategory.devTools, 1650, AppColors.serviceClaude),
  ServiceEntry('Claude Max', 'CL', SubscriptionCategory.devTools, 8250, AppColors.serviceClaude),
  ServiceEntry('ChatGPT Plus', 'GP', SubscriptionCategory.devTools, 1650, _saas),
  ServiceEntry('Cursor Pro', 'CU', SubscriptionCategory.devTools, 1650, _dev),
  ServiceEntry('GitHub Copilot', 'GH', SubscriptionCategory.devTools, 825, AppColors.serviceGithub),
  ServiceEntry('GitHub Team', 'GH', SubscriptionCategory.devTools, 330, AppColors.serviceGithub),
  ServiceEntry('JetBrains All Products', 'JB', SubscriptionCategory.devTools, 2075, _dev, cycle: BillingCycle.yearly),
  ServiceEntry('Vercel Pro', 'VE', SubscriptionCategory.devTools, 1650, _dev),
  ServiceEntry('Netlify Pro', 'NE', SubscriptionCategory.devTools, 1580, _dev),
  ServiceEntry('Postman', 'PM', SubscriptionCategory.devTools, 1160, _dev),
  ServiceEntry('Docker Pro', 'DO', SubscriptionCategory.devTools, 900, _dev),
  ServiceEntry('OpenAI API', 'OA', SubscriptionCategory.devTools, 0, _saas),
  ServiceEntry('Perplexity Pro', 'PX', SubscriptionCategory.devTools, 1650, _dev),
  ServiceEntry('Midjourney', 'MJ', SubscriptionCategory.devTools, 830, _dev),

  // ── Entertainment ─────────────────────────────────────────────────────
  ServiceEntry('Netflix', 'NF', SubscriptionCategory.entertainment, 649, AppColors.serviceNetflix),
  ServiceEntry('Netflix Premium', 'NF', SubscriptionCategory.entertainment, 649, AppColors.serviceNetflix),
  ServiceEntry('Amazon Prime', 'AP', SubscriptionCategory.entertainment, 1499, AppColors.serviceAws, cycle: BillingCycle.yearly),
  ServiceEntry('Hotstar (JioHotstar)', 'HS', SubscriptionCategory.entertainment, 299, _ent),
  ServiceEntry('SonyLIV', 'SL', SubscriptionCategory.entertainment, 999, _ent, cycle: BillingCycle.yearly),
  ServiceEntry('ZEE5', 'Z5', SubscriptionCategory.entertainment, 699, _ent, cycle: BillingCycle.yearly),
  ServiceEntry('Spotify', 'SP', SubscriptionCategory.entertainment, 119, AppColors.serviceSpotify),
  ServiceEntry('Spotify Family', 'SP', SubscriptionCategory.entertainment, 179, AppColors.serviceSpotify),
  ServiceEntry('YouTube Premium', 'YT', SubscriptionCategory.entertainment, 149, AppColors.serviceNetflix),
  ServiceEntry('YouTube Music', 'YM', SubscriptionCategory.entertainment, 99, AppColors.serviceNetflix),
  ServiceEntry('Apple Music', 'AM', SubscriptionCategory.entertainment, 99, _ent),
  ServiceEntry('Apple TV+', 'TV', SubscriptionCategory.entertainment, 99, _ent),
  ServiceEntry('JioSaavn Pro', 'JS', SubscriptionCategory.entertainment, 99, AppColors.serviceJio),
  ServiceEntry('Gaana Plus', 'GA', SubscriptionCategory.entertainment, 99, _ent),
  ServiceEntry('Audible', 'AU', SubscriptionCategory.entertainment, 199, AppColors.serviceAws),
  ServiceEntry('Kindle Unlimited', 'KU', SubscriptionCategory.entertainment, 169, AppColors.serviceAws),
  ServiceEntry('MUBI', 'MU', SubscriptionCategory.entertainment, 499, _ent),
  ServiceEntry('Crunchyroll', 'CR', SubscriptionCategory.entertainment, 79, _ent),
  ServiceEntry('Xbox Game Pass', 'XB', SubscriptionCategory.entertainment, 549, _ent),
  ServiceEntry('PlayStation Plus', 'PS', SubscriptionCategory.entertainment, 749, _ent, cycle: BillingCycle.quarterly),

  // ── Telecom / DTH ─────────────────────────────────────────────────────
  ServiceEntry('Jio Postpaid', 'JI', SubscriptionCategory.telecom, 399, AppColors.serviceJio),
  ServiceEntry('JioFiber', 'JF', SubscriptionCategory.telecom, 999, AppColors.serviceJio),
  ServiceEntry('Airtel Postpaid', 'AI', SubscriptionCategory.telecom, 449, AppColors.serviceNetflix),
  ServiceEntry('Airtel Xstream Fiber', 'AX', SubscriptionCategory.telecom, 799, AppColors.serviceNetflix),
  ServiceEntry('Vi Postpaid', 'VI', SubscriptionCategory.telecom, 401, _tel),
  ServiceEntry('BSNL Fiber', 'BS', SubscriptionCategory.telecom, 599, _tel),
  ServiceEntry('ACT Fibernet', 'AC', SubscriptionCategory.telecom, 749, _tel),
  ServiceEntry('Hathway Broadband', 'HW', SubscriptionCategory.telecom, 699, _tel),
  ServiceEntry('Excitel Broadband', 'EX', SubscriptionCategory.telecom, 599, _tel),
  ServiceEntry('Tata Play', 'TP', SubscriptionCategory.telecom, 349, _tel),
  ServiceEntry('DishTV', 'DT', SubscriptionCategory.telecom, 299, _tel),
  ServiceEntry('Airtel Digital TV', 'AD', SubscriptionCategory.telecom, 349, AppColors.serviceNetflix),

  // ── Cloud / hosting ───────────────────────────────────────────────────
  ServiceEntry('AWS', 'AW', SubscriptionCategory.cloud, 0, AppColors.serviceAws),
  ServiceEntry('Google Cloud', 'GC', SubscriptionCategory.cloud, 0, AppColors.serviceGoogle),
  ServiceEntry('Microsoft Azure', 'AZ', SubscriptionCategory.cloud, 0, _cloud),
  ServiceEntry('DigitalOcean', 'DO', SubscriptionCategory.cloud, 500, _cloud),
  ServiceEntry('Hostinger', 'HO', SubscriptionCategory.cloud, 249, _cloud),
  ServiceEntry('Hetzner', 'HZ', SubscriptionCategory.cloud, 450, _cloud),
  ServiceEntry('Linode (Akamai)', 'LI', SubscriptionCategory.cloud, 420, _cloud),
  ServiceEntry('GoDaddy Hosting', 'GD', SubscriptionCategory.cloud, 299, _cloud),
  ServiceEntry('Cloudflare Pro', 'CF', SubscriptionCategory.cloud, 1650, _cloud),
  ServiceEntry('Supabase Pro', 'SB', SubscriptionCategory.cloud, 2075, _saas),
  ServiceEntry('Firebase Blaze', 'FB', SubscriptionCategory.cloud, 0, AppColors.serviceAws),
  ServiceEntry('Railway', 'RW', SubscriptionCategory.cloud, 420, _cloud),
  ServiceEntry('Render', 'RE', SubscriptionCategory.cloud, 580, _cloud),

  // ── SaaS / business ───────────────────────────────────────────────────
  ServiceEntry('Google Workspace', 'GW', SubscriptionCategory.saas, 840, AppColors.serviceGoogle),
  ServiceEntry('Microsoft 365', 'MS', SubscriptionCategory.saas, 489, _saas),
  ServiceEntry('Zoho One', 'ZO', SubscriptionCategory.saas, 1250, _saas),
  ServiceEntry('Zoho Books', 'ZB', SubscriptionCategory.saas, 749, _saas),
  ServiceEntry('Slack Pro', 'SK', SubscriptionCategory.saas, 725, _saas),
  ServiceEntry('Zoom Pro', 'ZM', SubscriptionCategory.saas, 1300, _cloud),
  ServiceEntry('Canva Pro', 'CV', SubscriptionCategory.saas, 500, _saas),
  ServiceEntry('Adobe Creative Cloud', 'AE', SubscriptionCategory.saas, 4230, _ent),
  ServiceEntry('Figma Professional', 'FG', SubscriptionCategory.saas, 1245, _saas),
  ServiceEntry('Notion Plus', 'NO', SubscriptionCategory.saas, 830, _prod),
  ServiceEntry('Airtable', 'AT', SubscriptionCategory.saas, 1660, _saas),
  ServiceEntry('Mailchimp', 'MC', SubscriptionCategory.saas, 1100, _saas),
  ServiceEntry('HubSpot Starter', 'HU', SubscriptionCategory.saas, 1650, _saas),
  ServiceEntry('Freshworks CRM', 'FW', SubscriptionCategory.saas, 999, _saas),
  ServiceEntry('Razorpay (fees)', 'RZ', SubscriptionCategory.saas, 0, _saas),
  ServiceEntry('Shopify Basic', 'SH', SubscriptionCategory.saas, 1994, _saas),
  ServiceEntry('WordPress.com', 'WP', SubscriptionCategory.saas, 350, _saas),
  ServiceEntry('Grammarly Premium', 'GR', SubscriptionCategory.saas, 1000, _saas),
  ServiceEntry('LinkedIn Premium', 'LP', SubscriptionCategory.saas, 1567, _cloud),
  ServiceEntry('Naukri (recruiter)', 'NK', SubscriptionCategory.saas, 0, _saas),

  // ── Utility ───────────────────────────────────────────────────────────
  ServiceEntry('Swiggy One', 'SW', SubscriptionCategory.utility, 99, _util),
  ServiceEntry('Zomato Gold', 'ZG', SubscriptionCategory.utility, 99, _util, cycle: BillingCycle.quarterly),
  ServiceEntry('Amazon Prime Lite', 'PL', SubscriptionCategory.utility, 799, AppColors.serviceAws, cycle: BillingCycle.yearly),
  ServiceEntry('Blinkit (memberships)', 'BL', SubscriptionCategory.utility, 99, _util),
  ServiceEntry('Urban Company Plus', 'UC', SubscriptionCategory.utility, 299, _util, cycle: BillingCycle.quarterly),
  ServiceEntry('Cult.fit', 'CF', SubscriptionCategory.utility, 1250, _util),
  ServiceEntry('Times Prime', 'TM', SubscriptionCategory.utility, 1199, _util, cycle: BillingCycle.yearly),

  // ── Storage ───────────────────────────────────────────────────────────
  ServiceEntry('Google One', 'G1', SubscriptionCategory.storage, 130, AppColors.serviceGoogle),
  ServiceEntry('iCloud+', 'IC', SubscriptionCategory.storage, 75, _store),
  ServiceEntry('Dropbox Plus', 'DB', SubscriptionCategory.storage, 999, _store),
  ServiceEntry('OneDrive Standalone', 'OD', SubscriptionCategory.storage, 165, _store),
  ServiceEntry('Backblaze', 'BB', SubscriptionCategory.storage, 750, _store),

  // ── Security ──────────────────────────────────────────────────────────
  ServiceEntry('NordVPN', 'NV', SubscriptionCategory.security, 400, _sec),
  ServiceEntry('ExpressVPN', 'EV', SubscriptionCategory.security, 1080, _sec),
  ServiceEntry('1Password', '1P', SubscriptionCategory.security, 250, _sec),
  ServiceEntry('Bitwarden Premium', 'BW', SubscriptionCategory.security, 85, _sec, cycle: BillingCycle.yearly),
  ServiceEntry('Norton 360', 'N3', SubscriptionCategory.security, 899, _sec, cycle: BillingCycle.yearly),
  ServiceEntry('Quick Heal Total', 'QH', SubscriptionCategory.security, 1591, _sec, cycle: BillingCycle.yearly),

  // ── Productivity / finance ────────────────────────────────────────────
  ServiceEntry('Todoist Pro', 'TD', SubscriptionCategory.productivity, 350, _prod),
  ServiceEntry('Evernote Personal', 'EN', SubscriptionCategory.productivity, 360, _prod),
  ServiceEntry('Obsidian Sync', 'OB', SubscriptionCategory.productivity, 415, _prod),
  ServiceEntry('Headspace', 'HE', SubscriptionCategory.productivity, 399, _prod),
  ServiceEntry('Calm', 'CA', SubscriptionCategory.productivity, 299, _prod),
  ServiceEntry('Duolingo Super', 'DU', SubscriptionCategory.productivity, 599, _prod),
  ServiceEntry('The Hindu (digital)', 'TH', SubscriptionCategory.productivity, 199, _prod),
  ServiceEntry('Times of India+', 'TO', SubscriptionCategory.productivity, 99, _prod),
  ServiceEntry('ET Prime', 'ET', SubscriptionCategory.productivity, 299, _prod),
  ServiceEntry('Moneycontrol Pro', 'MP', SubscriptionCategory.productivity, 249, _prod),
  ServiceEntry('Tickertape Pro', 'TT', SubscriptionCategory.productivity, 177, _prod),
  ServiceEntry('Smallcase (fees)', 'SC', SubscriptionCategory.productivity, 0, _prod),
];
