/** Localizable strings for {@link LineDevelopersConsole}. */
export interface LineDevelopersConsoleMessages {
  readonly searchPlaceholder: string;
  readonly searchLabel: string;
  readonly refresh: string;
  readonly refreshLabel: string;
  readonly collapseAll: string;
  readonly collapseAllLabel: string;
  readonly loadingLabel: string;
  readonly loadFailed: string;
  readonly retry: string;
  readonly emptyProviders: string;
  readonly emptyProvidersHint: string;
  readonly noAdapter: string;
  readonly noAdapterHint: string;
  readonly openConsole: string;
  readonly openLiff: string;
  readonly treeLabel: string;
  readonly provider: string;
  readonly channel: string;
  readonly channels: string;
  readonly providerId: string;
  readonly region: string;
  readonly certified: string;
  readonly yes: string;
  readonly no: string;
  readonly created: string;
  readonly channelId: string;
  readonly status: string;
  readonly botBasicId: string;
  readonly botUserId: string;
  readonly webhookUrl: string;
  readonly callbackUrl: string;
  readonly email: string;
  readonly channelSecret: string;
  readonly accessToken: string;
  readonly reveal: string;
  readonly hide: string;
  readonly copy: string;
  readonly secretRevealed: string;
  readonly secretMasked: string;
  readonly liffId: string;
  readonly liffSize: string;
  readonly liffUrl: string;
  readonly liffDescription: string;
  readonly rowSummary: (providers: number, channels: number, liffApps: number) => string;
}

/** Default English messages. */
export const defaultLineDevelopersConsoleMessages: LineDevelopersConsoleMessages = {
  searchPlaceholder: "Filter by provider, channel id, or LIFF id…",
  searchLabel: "Filter hierarchy",
  refresh: "Refresh",
  refreshLabel: "Refresh from console",
  collapseAll: "Collapse all",
  collapseAllLabel: "Collapse all",
  loadingLabel: "Loading hierarchy",
  loadFailed: "Couldn't reach the console.",
  retry: "Retry",
  emptyProviders: "No providers",
  emptyProvidersHint: "Create a provider in the console, then refresh.",
  noAdapter: "No adapter configured",
  noAdapterHint: "Provide a LineConsoleAdapter to load provider data.",
  openConsole: "Open in console",
  openLiff: "LIFF app",
  treeLabel: "LINE Developers Console hierarchy",
  provider: "Provider",
  channel: "channel",
  channels: "channels",
  providerId: "Provider ID",
  region: "Region",
  certified: "Certified",
  yes: "Yes",
  no: "No",
  created: "Created",
  channelId: "Channel ID",
  status: "Status",
  botBasicId: "Bot Basic ID",
  botUserId: "Bot User ID",
  webhookUrl: "Webhook URL",
  callbackUrl: "Callback URL",
  email: "Email",
  channelSecret: "Channel Secret",
  accessToken: "Channel Access Token",
  reveal: "Reveal",
  hide: "Hide",
  copy: "Copy",
  secretRevealed: "Secret revealed",
  secretMasked: "Secret masked",
  liffId: "LIFF ID",
  liffSize: "Size",
  liffUrl: "View URL",
  liffDescription: "Description",
  rowSummary: (providers, channels, liffApps) =>
    `${providers} provider${providers === 1 ? "" : "s"} · ${channels} channel${channels === 1 ? "" : "s"} · ${liffApps} LIFF`,
};
