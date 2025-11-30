export async function updateJobSalary(jobId: string, data: any) {
  const res = await fetch(`/api/jobs/${jobId}/salary-analysis`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-dev-user-id": localStorage.getItem("devUserId") || "test-user",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to update salary details");
  }

  return await res.json();
}