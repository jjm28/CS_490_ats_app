import API_BASE from "../utils/apiBase";

// Constants
const API_URL = `${API_BASE}/api/auth/`;

// Interfaces
export interface Register {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface PostRegisterResponse {
  token: string;
  userid: string;
  user: {
    email: string;
  };
}
export interface Login {
  email: string;
  password: string;
}

export interface PostLoginResponse {
  token: string;
  userId: string;
  user: {
    _id: string;
    email: string;
    role: string;
    organizationId: string
    firstName: string;
    lastName: string;

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

export const LoginUser = async (  LoginInfo: Login ): Promise<PostLoginResponse> => {
  const res = await fetch(API_URL + "login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(LoginInfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostLoginResponse>;
};


export interface UpdateRole {
  userId?: string;
  role?: string;
  organizationId?: string;
}

export interface PostUpdateRole {
  token: string;
  userId: string;
  user: {
    _id: string;
    email: string;
    role: string;
    organizationId: string
    firstName: string;
    lastName: string;

  };
}
export const UpdateRole = async (  UpdateRole: UpdateRole ): Promise<PostLoginResponse> => {
  const res = await fetch(API_URL + "update", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(UpdateRole),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostLoginResponse>;
};