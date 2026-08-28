export type MailPreferenceType = {
  id: string
  label: string
  enabled: boolean
}

export type MailPreferenceView = {
  role: string
  email: string
  emailMissing: boolean
  types: MailPreferenceType[]
}

export type MailPreferenceUpdate = {
  types: Array<{ id: string; enabled: boolean }>
}
