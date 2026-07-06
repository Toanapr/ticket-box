export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  tokenType: "Bearer";
}

export interface AuthActionResult {
  ok: boolean;
  message: string;
  user?: AuthUser;
}
