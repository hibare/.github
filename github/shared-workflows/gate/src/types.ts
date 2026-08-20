export interface GateExchangeRequest {
  oidc_token: string;
  target_repository: string;
  policy_name?: string;
  requested_permissions?: Record<string, string>;
  requested_ttl?: number;
}

export interface GateExchangeResponse {
  token: string;
  expires_at: string;
  matched_policy: string;
  permissions: Record<string, string>;
  request_id: string;
}

export interface GateErrorResponse {
  error?: string;
  error_code?: string;
  message?: string;
}
