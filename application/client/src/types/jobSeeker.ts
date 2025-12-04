export interface JobSeekerSummary {
  _id: string;
  email: string;
  fullName: string;
  isDeleted: boolean;
  createdAt: string;
  cohortsCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
