// client/src/utils/apiFetch.ts

export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  const authData =
    localStorage.getItem("auth") ||
    localStorage.getItem("authUser");

  let token: string | null = null;

  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      token = parsed?.token || parsed?.accessToken || null;
    } catch {
      console.warn("Invalid auth data in localStorage");
    }
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
