import type { CoverLetterData } from "../components/Coverletter/CoverLetterTemplates/Pdf/Formalpdf";
import type { Template } from "../components/Coverletter/Coverletterstore";

// Constants
const API_URL = "http://localhost:5050/api/coverletter/";


const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// Interfaces
export interface Coverletter {
  userid: string;
  filename: string;
  templateKey: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
}
export interface ListCoverletter {
  userid: string;

}
export interface GetCoverletter {
  userid: string;
  coverletterid: string;

}
export interface GetCoverletterResponse {
  userid: string;
  filename: string;
  templateKey: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
}

export interface UpdateCoverletter {
  coverletterid: string;
  userid: string;
  filename: string;
  coverletterdata: CoverLetterData;
  lastSaved: string;
}

export interface PostCoverletterResponse {
  _id: string
}

export interface CoverletterSummary {
  _id: string;
  filename: string;
  templateKey: Template["key"];
  lastSaved: string;

}

export type ListCoverlettersResponse = CoverletterSummary[];



export  const Getfullcoverletter = async (  coverletterinfo: GetCoverletter ): Promise<GetCoverletterResponse> => {
  const res = await fetch(API_URL+ `?userid=${coverletterinfo.userid}&coverletterid=${coverletterinfo.coverletterid}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetCoverletterResponse>;
};


export  const listCoverletters = async (  coverletterinfo: ListCoverletter ): Promise<ListCoverlettersResponse> => {
  const res = await fetch(API_URL+ `?userid=${coverletterinfo.userid}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<ListCoverlettersResponse>;
};


// API Function
export  const saveCoverletter = async (  coverletterinfo: Coverletter ): Promise<PostCoverletterResponse> => {
  const res = await fetch(API_URL + "save", {
    method: "POST",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostCoverletterResponse>;
};

export  const  updateCoverletter = async (  coverletterinfo: UpdateCoverletter ): Promise<PostCoverletterResponse> => {
  const res = await fetch(API_URL + "update", {
    method: "PUT",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostCoverletterResponse>;
};


export interface CreateSharedCoverletter {
  userid: string;
  coverletterid: string;
  coverletterdata: CoverLetterData;
}
export interface PostSharedCoverletterResponse {
  sharedid: string;
  url: string;
  owner: string;
}
export  const createdsharedcoverletter = async (  coverletterinfo: CreateSharedCoverletter ): Promise<PostSharedCoverletterResponse> => {
  const res = await fetch(API_URL + "share", {
    method: "POST",
    headers: authHeaders() ,
    body: JSON.stringify(coverletterinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<PostSharedCoverletterResponse>;
};

export interface fetchSharedCoverletter {
sharedid: string;

}
export interface GetSharedCoverletterResponse {
  _id: string;
  owner: string;
  filename: string;
  templateKey: Template["key"];
  coverletterdata: CoverLetterData;
  lastSaved: string;
}
export  const fetchSharedCoverletter = async (  coverletterinfo: fetchSharedCoverletter ): Promise<GetSharedCoverletterResponse> => {
  const res = await fetch(API_URL+ `share?sharedid=${coverletterinfo.sharedid}` , {
    headers: authHeaders() ,  });
  console.log(API_URL+ `/share?sharedid=${coverletterinfo.sharedid}`)
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetSharedCoverletterResponse>;
};

export interface GetmostpopularCoverletterResponse {
  templateKey: Template["key"];

}
export  const GetmostpopularCoverletter = async ( ): Promise<GetmostpopularCoverletterResponse> => {
  const res = await fetch(API_URL+ "mostpop" , {
    headers: authHeaders() ,  });
  const data = await res.json() ?? {    "templateKey": "formal" };
  console.log(data)
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetmostpopularCoverletterResponse>;
};

export interface AIGenerateRequest {
  job_title: string;
  company_name: string;
  company_summary?: string;
  company_address?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_address?: string;
  user_skills?: string[] | string;
  user_experience?: string | number;
}

export interface AIGenerateResponse {
  success: boolean;
  cover_letter: string;
  company_research?: {
    name: string;
    mission?: string;
    recent_news?: string[];
    ai_summary?: string;
  };
  error?: string;
}

// === AI GENERATION API ===
export const AIGenerateCoverletter = async (
  payload: AIGenerateRequest
): Promise<AIGenerateResponse> => {
  const API = import.meta.env.VITE_API_URL || `http://${location.hostname}:8000`;


  const res = await fetch(`${API}/coverletter/ai-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI generation failed");
  }

  return data as AIGenerateResponse;
};
