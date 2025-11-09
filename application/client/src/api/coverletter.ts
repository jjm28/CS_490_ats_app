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

export  const 
updateCoverletter = async (  coverletterinfo: UpdateCoverletter ): Promise<PostCoverletterResponse> => {
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




