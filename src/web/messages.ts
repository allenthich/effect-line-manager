export interface LineAccountManagementMessages {
  readonly title: string;
  readonly description: string;
  readonly addAccount: string;
  readonly createHeading: string;
  readonly editHeading: string;
  readonly deleteHeading: string;
  readonly messagingApiGroup: string;
  readonly lineLoginGroup: string;
  readonly liffGroup: string;
  readonly nameLabel: string;
  readonly nameHint: string;
  readonly channelIdLabel: string;
  readonly channelIdHint: string;
  readonly channelAccessTokenLabel: string;
  readonly channelAccessTokenCreateHint: string;
  readonly channelAccessTokenEditHint: string;
  readonly channelSecretLabel: string;
  readonly channelSecretCreateHint: string;
  readonly channelSecretEditHint: string;
  readonly loginChannelIdLabel: string;
  readonly loginChannelSecretLabel: string;
  readonly loginChannelSecretEditHint: string;
  readonly liffIdLabel: string;
  readonly activeLabel: string;
  readonly activeStatus: string;
  readonly inactiveStatus: string;
  readonly loginConfigured: string;
  readonly loginNotConfigured: string;
  readonly liffConfigured: string;
  readonly liffNotConfigured: string;
  readonly editAccount: string;
  readonly deleteAccount: string;
  readonly activateAccount: string;
  readonly deactivateAccount: string;
  readonly cancel: string;
  readonly createAccount: string;
  readonly saveChanges: string;
  readonly confirmDelete: string;
  readonly loadingAccounts: string;
  readonly creatingAccount: string;
  readonly savingAccount: string;
  readonly updatingStatus: string;
  readonly deletingAccount: string;
  readonly emptyHeading: string;
  readonly emptyDescription: string;
  readonly adapterMissingHeading: string;
  readonly adapterMissingDescription: string;
  readonly retry: string;
  readonly requiredField: string;
  readonly whitespaceField: string;
  readonly loadFailure: string;
  readonly createFailure: string;
  readonly updateFailure: string;
  readonly toggleFailure: string;
  readonly deleteFailure: string;
  readonly createSuccess: string;
  readonly updateSuccess: string;
  readonly deleteSuccess: string;
  readonly configuredBadge: string;
  readonly notConfiguredBadge: string;
  readonly deleteConfirmation: (name: string) => string;
  readonly profileImageAlt: (name: string) => string;
}

export const defaultLineAccountManagementMessages: LineAccountManagementMessages = {
  title: "LINE accounts",
  description: "Create and manage Messaging API, LINE Login, and LIFF configuration.",
  addAccount: "Add account",
  createHeading: "Add LINE account",
  editHeading: "Edit LINE account",
  deleteHeading: "Delete LINE account",
  messagingApiGroup: "Messaging API",
  lineLoginGroup: "LINE Login",
  liffGroup: "LIFF",
  nameLabel: "Account name",
  nameHint: "A name used to identify this account.",
  channelIdLabel: "Channel ID",
  channelIdHint: "The Messaging API channel ID.",
  channelAccessTokenLabel: "Channel access token",
  channelAccessTokenCreateHint: "Enter the Messaging API channel access token.",
  channelAccessTokenEditHint: "Leave blank to keep the current token.",
  channelSecretLabel: "Channel secret",
  channelSecretCreateHint: "Enter the Messaging API channel secret.",
  channelSecretEditHint: "Leave blank to keep the current secret.",
  loginChannelIdLabel: "LINE Login channel ID",
  loginChannelSecretLabel: "LINE Login channel secret",
  loginChannelSecretEditHint: "Leave blank to keep the current secret.",
  liffIdLabel: "LIFF ID",
  activeLabel: "Account active",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  loginConfigured: "LINE Login",
  loginNotConfigured: "LINE Login",
  liffConfigured: "LIFF",
  liffNotConfigured: "LIFF",
  editAccount: "Edit",
  deleteAccount: "Delete",
  activateAccount: "Activate",
  deactivateAccount: "Deactivate",
  cancel: "Cancel",
  createAccount: "Create account",
  saveChanges: "Save changes",
  confirmDelete: "Delete account",
  loadingAccounts: "Loading LINE accounts...",
  creatingAccount: "Creating account...",
  savingAccount: "Saving changes...",
  updatingStatus: "Updating account status...",
  deletingAccount: "Deleting account...",
  emptyHeading: "No LINE accounts",
  emptyDescription: "Add an account to begin managing LINE configuration.",
  adapterMissingHeading: "Account adapter required",
  adapterMissingDescription:
    "Assign a LINE account management adapter to load and change accounts.",
  retry: "Retry",
  requiredField: "This field is required.",
  whitespaceField: "Enter a value containing non-whitespace characters.",
  loadFailure: "LINE accounts could not be loaded.",
  createFailure: "The LINE account could not be created.",
  updateFailure: "The LINE account could not be updated.",
  toggleFailure: "The LINE account status could not be updated.",
  deleteFailure: "The LINE account could not be deleted.",
  createSuccess: "LINE account created.",
  updateSuccess: "LINE account updated.",
  deleteSuccess: "LINE account deleted.",
  configuredBadge: "Saved",
  notConfiguredBadge: "Not set",
  deleteConfirmation: (name) => `Delete ${name}? This action cannot be undone.`,
  profileImageAlt: (name) => `${name} profile image`,
};
