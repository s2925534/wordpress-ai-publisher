export type SettingsCompletionStatus = {
  configured: boolean;
  missing: string[];
};

export function buildSettingsCompletionStatus(values: {
  appUrl?: string;
  openAiKey?: string;
  wordpressSiteUrl?: string;
  wordpressUsername?: string;
  wordpressPassword?: string;
  pluginToken?: string;
}) : SettingsCompletionStatus {
  const missing: string[] = [];

  if (!values.appUrl) missing.push('App URL');
  if (!values.openAiKey) missing.push('OpenAI API key');
  if (!values.wordpressSiteUrl) missing.push('WordPress site');
  if (!values.wordpressUsername) missing.push('WordPress username');
  if (!values.wordpressPassword) missing.push('WordPress application password');
  if (!values.pluginToken) missing.push('WordPress plugin token');

  return {
    configured: missing.length === 0,
    missing
  };
}
