import { api } from "./api";
import { tokenStorage } from "./storage";
import type { User, UserRole } from "@/types";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
}

export async function login(email: string, password: string): Promise<UserRole> {
  // El backend usa OAuth2PasswordRequestForm -> requiere form-urlencoded, no JSON.
  const body = new URLSearchParams({ username: email, password }).toString();
  const data = await api.post<TokenResponse>("/api/auth/login", body, {
    isForm: true,
    auth: false,
  });
  await tokenStorage.setTokens(data.access_token, data.refresh_token);
  return data.role;
}

export async function register(payload: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): Promise<void> {
  await api.post("/api/auth/register", payload, { auth: false });
}

export async function fetchCurrentUser(): Promise<User> {
  return api.get<User>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await tokenStorage.clear();
}
