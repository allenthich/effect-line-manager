/** Internationalisation messages for all LINE account management UI labels, headings, hints, and status text. */
export interface LineAccountManagementMessages {
  readonly title: string;
  readonly description: string;
  readonly providersTab: string;
  readonly messagingChannelsTab: string;
  readonly loginChannelsTab: string;
  readonly liffAppsTab: string;

  // Providers
  readonly addProvider: string;
  readonly createProviderHeading: string;
  readonly editProviderHeading: string;
  readonly deleteProviderHeading: string;
  readonly providerNameLabel: string;
  readonly providerNameHint: string;

  // Shared channel labels (apply to both messaging and login channels)
  readonly channelProviderLabel: string;
  readonly channelNameLabel: string;
  readonly channelNameHint: string;
  readonly channelIdLabel: string;
  readonly channelIdHint: string;
  readonly channelSecretLabel: string;
  readonly channelSecretCreateHint: string;
  readonly channelSecretEditHint: string;

  // Messaging channels
  readonly addMessagingChannel: string;
  readonly createMessagingChannelHeading: string;
  readonly editMessagingChannelHeading: string;
  readonly deleteMessagingChannelHeading: string;
  readonly messagingChannelAccessTokenLabel: string;
  readonly messagingChannelAccessTokenCreateHint: string;
  readonly messagingChannelAccessTokenEditHint: string;
  readonly messagingChannelStatusLabel: string;

  // Login channels
  readonly addLoginChannel: string;
  readonly createLoginChannelHeading: string;
  readonly editLoginChannelHeading: string;
  readonly deleteLoginChannelHeading: string;

  // LIFF Apps
  readonly addLiffApp: string;
  readonly createLiffAppHeading: string;
  readonly editLiffAppHeading: string;
  readonly deleteLiffAppHeading: string;
  readonly liffChannelLabel: string;
  readonly liffIdLabel: string;
  readonly liffIdHint: string;
  readonly liffViewTypeLabel: string;
  readonly liffViewUrlLabel: string;
  readonly liffViewUrlHint: string;
  readonly liffDescriptionLabel: string;

  // General Actions / Labels
  readonly cancel: string;
  readonly saveChanges: string;
  readonly confirmDelete: string;
  readonly activeStatus: string;
  readonly inactiveStatus: string;
  readonly loading: string;
  readonly emptyProviders: string;
  readonly emptyMessagingChannels: string;
  readonly emptyLoginChannels: string;
  readonly emptyLiffApps: string;
  readonly adapterMissingDescription: string;
  readonly retry: string;
  readonly requiredField: string;
  readonly whitespaceField: string;
  readonly loadFailure: string;
  readonly createFailure: string;
  readonly updateFailure: string;
  readonly deleteFailure: string;
  readonly createSuccess: string;
  readonly updateSuccess: string;
  readonly deleteSuccess: string;
  readonly deleteConfirmation: (type: string, name: string) => string;
}

/** Default English i18n messages for LINE account management UI components. */
export const defaultLineAccountManagementMessages: LineAccountManagementMessages = {
  title: "LINE Configuration",
  description: "Manage LINE Providers, Messaging Channels, Login Channels, and LIFF applications.",
  providersTab: "Providers",
  messagingChannelsTab: "Messaging Channels",
  loginChannelsTab: "Login Channels",
  liffAppsTab: "LIFF Apps",

  // Providers
  addProvider: "Add Provider",
  createProviderHeading: "Add LINE Provider",
  editProviderHeading: "Edit LINE Provider",
  deleteProviderHeading: "Delete LINE Provider",
  providerNameLabel: "Provider name",
  providerNameHint: "A name to identify the LINE Provider.",

  // Shared channel labels
  channelProviderLabel: "Provider",
  channelNameLabel: "Channel name",
  channelNameHint: "A name to identify the LINE Channel.",
  channelIdLabel: "Channel ID",
  channelIdHint: "The LINE Channel ID.",
  channelSecretLabel: "Channel secret",
  channelSecretCreateHint: "Enter the LINE Channel secret.",
  channelSecretEditHint: "Leave blank to keep the current channel secret.",

  // Messaging channels
  addMessagingChannel: "Add Messaging Channel",
  createMessagingChannelHeading: "Add LINE Messaging Channel",
  editMessagingChannelHeading: "Edit LINE Messaging Channel",
  deleteMessagingChannelHeading: "Delete LINE Messaging Channel",
  messagingChannelAccessTokenLabel: "Channel access token",
  messagingChannelAccessTokenCreateHint: "Enter the Messaging API channel access token.",
  messagingChannelAccessTokenEditHint: "Leave blank to keep the current access token.",
  messagingChannelStatusLabel: "Channel active",

  // Login channels
  addLoginChannel: "Add Login Channel",
  createLoginChannelHeading: "Add LINE Login Channel",
  editLoginChannelHeading: "Edit LINE Login Channel",
  deleteLoginChannelHeading: "Delete LINE Login Channel",

  // LIFF Apps
  addLiffApp: "Add LIFF App",
  createLiffAppHeading: "Add LIFF Application",
  editLiffAppHeading: "Edit LIFF Application",
  deleteLiffAppHeading: "Delete LIFF Application",
  liffChannelLabel: "Login Channel",
  liffIdLabel: "LIFF ID",
  liffIdHint: "The LINE-assigned LIFF ID.",
  liffViewTypeLabel: "View Type",
  liffViewUrlLabel: "View URL",
  liffViewUrlHint: "The endpoint URL for the LIFF application.",
  liffDescriptionLabel: "Description",

  // General Actions / Labels
  cancel: "Cancel",
  saveChanges: "Save changes",
  confirmDelete: "Delete",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  loading: "Loading content...",
  emptyProviders: "No LINE Providers found. Add a provider to get started.",
  emptyMessagingChannels: "No LINE Messaging Channels found under this provider.",
  emptyLoginChannels: "No LINE Login Channels found under this provider.",
  emptyLiffApps: "No LIFF applications found under this login channel.",
  adapterMissingDescription:
    "Assign a LINE provider management adapter to load and change configuration.",
  retry: "Retry",
  requiredField: "This field is required.",
  whitespaceField: "Enter a value containing non-whitespace characters.",
  loadFailure: "Data could not be loaded.",
  createFailure: "The item could not be created.",
  updateFailure: "The changes could not be saved.",
  deleteFailure: "The item could not be deleted.",
  createSuccess: "Item created successfully.",
  updateSuccess: "Changes saved successfully.",
  deleteSuccess: "Item deleted successfully.",
  deleteConfirmation: (type, name) =>
    `Delete the ${type} "${name}"? This action cannot be undone and may cascade delete child resources.`,
};
