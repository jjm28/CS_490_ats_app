const API_URL="http://localhost:5050/api/reference/";
export type RefereeFormData = {
  full_name: string,
  title: string,
  organization: string,
  relationship: string,
  email: string,
  phone?: string,
  preferred_contact_method: "email" | "phone" | "",
  availability_notes?: string,
  tags: string[],
  last_used_at: string,
  usage_count: number,
};
const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

type  AddnewRefree= RefereeFormData & {
    user_id: string

};

export type ResponseAddnewRefree = {

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

