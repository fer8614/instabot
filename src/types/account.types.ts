export interface InstagramAccount {
  id: string;
  name: string;
  page_id: string;
  access_token: string;
  verify_token: string;
  app_secret: string;
  resend_api_key: string | null;
  email_from: string | null;
  welcome_email_template: string | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AccountContext {
  id: string;
  name: string;
  pageId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  resendApiKey?: string;
  emailFrom?: string;
  welcomeEmailTemplate?: string;
  enabled: boolean;
}
