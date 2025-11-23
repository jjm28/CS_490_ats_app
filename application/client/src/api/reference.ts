const API_URL="http://localhost:5050/api/reference/";
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