// Constants
const API_URL = "http://localhost:5050/api/auth/";

// Interfaces
export interface Register {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface PostRegisterResponse {
  userid: string;
  User: {
    email: string;
  };
}

// API Function
export const createUser = async (  registerInfo: Register ): Promise<PostRegisterResponse> => {
  const res = await fetch(API_URL + "register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registerInfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostRegisterResponse>;
};
