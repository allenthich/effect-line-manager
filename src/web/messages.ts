export interface LineAccountManagementMessages {
  readonly title: string;
  readonly description: string;
  readonly providersTab: string;
  readonly channelsTab: string;
  readonly liffAppsTab: string;

  // Providers
  readonly addProvider: string;
  readonly createProviderHeading: string;
  readonly editProviderHeading: string;
  readonly deleteProviderHeading: string;
  readonly providerNameLabel: string;
  readonly providerNameHint: string;

  // Channels
  readonly addChannel: string;
  readonly createChannelHeading: string;
  readonly editChannelHeading: string;
  readonly deleteChannelHeading: string;
  readonly channelProviderLabel: string;
  readonly channelTypeLabel: string;
  readonly channelNameLabel: string;
  readonly channelNameHint: string;
  readonly channelIdLabel: string;
  readonly channelIdHint: string;
  readonly channelSecretLabel: string;
  readonly channelSecretCreateHint: string;
  readonly channelSecretEditHint: string;
  readonly channelAccessTokenLabel: string;
  readonly channelAccessTokenCreateHint: string;
  readonly channelAccessTokenEditHint: string;
  readonly channelStatusLabel: string;

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
  readonly emptyChannels: string;
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

export const defaultLineAccountManagementMessages: LineAccountManagementMessages = {
  title: "LINE Configuration",
  description:
    "Manage LINE Providers, Channels (Messaging API / LINE Login), and LIFF applications.",
  providersTab: "Providers",
  channelsTab: "Channels",
  liffAppsTab: "LIFF Apps",

  // Providers
  addProvider: "Add Provider",
  createProviderHeading: "Add LINE Provider",
  editProviderHeading: "Edit LINE Provider",
  deleteProviderHeading: "Delete LINE Provider",
  providerNameLabel: "Provider name",
  providerNameHint: "A name to identify the LINE Provider.",

  // Channels
  addChannel: "Add Channel",
  createChannelHeading: "Add LINE Channel",
  editChannelHeading: "Edit LINE Channel",
  deleteChannelHeading: "Delete LINE Channel",
  channelProviderLabel: "Provider",
  channelTypeLabel: "Channel Type",
  channelNameLabel: "Channel name",
  channelNameHint: "A name to identify the LINE Channel.",
  channelIdLabel: "Channel ID",
  channelIdHint: "The LINE Channel ID.",
  channelSecretLabel: "Channel secret",
  channelSecretCreateHint: "Enter the LINE Channel secret.",
  channelSecretEditHint: "Leave blank to keep the current channel secret.",
  channelAccessTokenLabel: "Channel access token",
  channelAccessTokenCreateHint: "Enter the Messaging API channel access token.",
  channelAccessTokenEditHint: "Leave blank to keep the current access token.",
  channelStatusLabel: "Channel active",

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
  emptyChannels: "No LINE Channels found under this provider.",
  emptyLiffApps: "No LIFF applications found under this channel.",
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
