export function setAuth(token: string, user?: any) {
      console.log(token,user)

  localStorage.setItem("authToken", token);
  localStorage.setItem("token", token);
  if (user) localStorage.setItem("authUser", JSON.stringify(user));
  // poke other tabs/components
  localStorage.setItem("auth:changed", String(Date.now()));
  localStorage.removeItem("auth:changed");
}

export function clearAuth() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  localStorage.setItem("auth:changed", String(Date.now()));
  localStorage.removeItem("auth:changed");
}

export function isLoggedIn() {
  return !!localStorage.getItem("authToken");
}