import API_BASE from "../utils/apiBase";
const API_URL=`${API_BASE}/api/reference/`;
type AvailabilityStatus = "available" | "limited" | "unavailable" | "other" | "";
interface RelationshipEntry {
  action: string;
  message_content?: string;
  created_at: Date;
}
export type RefereeFormData = {
  full_name: string,
  title: string,
  organization: string,
  relationship: string,
  email: string,
  phone?: string,
  preferred_contact_method: "email" | "phone" | "",
  tags: string[],
  availability_status: AvailabilityStatus;
  availability_other_note?: string;

  
  preferred_opportunity_types: string[];  // below
  preferred_number_of_uses?: number | null;

  last_used_at?: string,
  usage_count?: number,
  relationship_history?: RelationshipEntry[];
};
const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

type  AddnewRefree= RefereeFormData 
 & {
    user_id: string;
    referenceid?: string;
};

export type ResponseAddnewRefree = {
 _id :string
}

export  const addnewReferee = async (  refereeinfo: AddnewRefree ): Promise<ResponseAddnewRefree> => {
  const res = await fetch(API_URL + "addnew", {
    method: "POST",
    headers: authHeaders() ,
    body: JSON.stringify(refereeinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<ResponseAddnewRefree>;
};


export type  GetReferee=  {
    user_id: string;
    referee_id: string;

};

 export type  GetRefereeResponse=RefereeFormData&  {
    user_id: string;
    _id: string;
    relationship_history?: RelationshipEntry[];


};



export  const getReferee = async (  refereeinfo: GetReferee ): Promise<GetRefereeResponse> => {
  const res = await fetch(API_URL+ `?userid=${refereeinfo.user_id}&referee_id=${refereeinfo.referee_id}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetRefereeResponse>;
};

export type  GetALLReferee=  {
    user_id: string;

};

 export type  GetALLRefereeResponse = {
    referees : GetRefereeResponse[]
 }

export  const getAllReferee = async (  refereeinfo: GetALLReferee ): Promise<GetALLRefereeResponse> => {
  const res = await fetch(API_URL+ `all?userid=${refereeinfo.user_id}` , {
    headers: authHeaders() ,  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<GetALLRefereeResponse>;
};


export type  DeleteReferees=  {
    referee_ids: string[];

};

 export type  DeleteRefereesResponse = {
    completed : boolean
 }

export  const DeleteThisReferees = async (  refereeinfo: DeleteReferees ): Promise<DeleteRefereesResponse> => {
  const res = await fetch(API_URL, {
    method: "DELETE",
    headers: authHeaders() ,
    body: JSON.stringify(refereeinfo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown error occurred");
  }

  return data as Promise<DeleteRefereesResponse>;
};


export async function logReferenceRelationship(opts: {
  referenceId: string;
  action: string;
  message_content?: string;
}) {
  const res = await fetch(`${API_URL}relationship/add`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      // add auth header if needed
    },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to log relationship entry");
  }

  return res.json();
}

export async function generateAppreciationMessage(opts: {
  reference: any;
  job?: any;
  type: "thank_you" | "update" | "general";
}) {
  const res = await fetch(`${API_URL}generate-appreciation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // auth if needed
    },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to generate appreciation message");
  }

  return res.json() as Promise<{ generated_message: string }>;
}

export interface ReferenceImpact {
  reference_id: string;
  applications: number;
  interviews: number;
  offers: number;
  success_rate: number; // 0–1
}

export async function getReferenceImpact(opts: {
  user_id: string;
}): Promise<ReferenceImpact[]> {
  const res = await fetch(
    `${API_URL}impact?user_id=${encodeURIComponent(opts.user_id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // add Authorization if your routes are protected
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load reference impact");
  }

  return res.json();
}


export interface PortfolioReference {
  reference_id: string;
  full_name: string;
  title?: string;
  organization?: string;
  relationship?: string;
  email?: string;
  tags: string[];
  stats: {
    applications: number;
    offers: number;
    success_rate: number; // 0–1
  };
  score: number;
  summary: string;
}

export interface ReferencePortfolioResponse {
  goal: string;
  generated_at: string;
  references: PortfolioReference[];
}

export async function getReferencePortfolio(opts: {
  user_id: string;
  goal: string;
  limit?: number;
}): Promise<ReferencePortfolioResponse> {
  const res = await fetch(`${API_URL}portfolio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // optionally Authorization if needed
    },
    body: JSON.stringify({ ...opts, useAI: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to generate reference portfolio");
  }

  return res.json();
}


export async function attachReferencesToJob(params: {
  job_id: string;
  referenceIds: string[];
  token: string;
}) {
  const res = await fetch(`${API_URL}addtojob`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ job_id: params.job_id, referenceIds: params.referenceIds }),
  });
  if (!res.ok) throw new Error("Failed to attach references");
  return res.json();
}

export async function detachReferenceFromJob(params: {
  job_id: string;
  referenceId: string;
  token: string;
}) {
  const res = await fetch(`${API_URL}removetojob`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ job_id: params.job_id, referenceId: params.referenceId }),
  });
  if (!res.ok) throw new Error("Failed to detach reference");
  return res.json();
}

export async function updateReferenceStatus(params: {
  job_id: string;
  referenceId: string;
  status: "planned" | "requested" | "confirmed" | "declined" | "completed";
  token: string;
}) {
  const res = await fetch(`${API_URL}updaterefstat`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      job_id: params.job_id,
      referenceId: params.referenceId,
      status: params.status,
    }),
  });
  if (!res.ok) throw new Error("Failed to update reference status");
  return res.json();
}

export async function generateReferenceRequest(params: {
  job_id: string;
  referenceId: string;
  user_id: string;
  token: string;
}) {
  const res = await fetch(`${API_URL}generate-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      job_id: params.job_id,
      referenceId: params.referenceId,
      user_id: params.user_id,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to generate reference request");
  }
  return res.json();
}

export async function generateReferencePrep(params: {
  job_id: string;
  referenceId: string;
  user_id: string;
  token: string;
}) {
  const res = await fetch(`${API_URL}generate-prep`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      job_id: params.job_id,
      referenceId: params.referenceId,
      user_id: params.user_id,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to generate prep");
  }
  return res.json();
}

export async function updateReferenceFeedback(params: {
  job_id: string;
  referenceId: string;
  user_id: string;
  token: string;
  feedback: {
    feedback_rating?: "strong_positive" | "positive" | "neutral" | "mixed" | "negative";
    feedback_source?: "recruiter" | "hiring_manager" | "other";
    feedback_summary?: string;
    feedback_notes?: string;
  };
}) {
  const res = await fetch(`${API_URL}update-feedback`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      job_id: params.job_id,
      referenceId: params.referenceId,
      user_id: params.user_id,
      feedback: params.feedback,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to save feedback");
  }
  return res.json();
}
