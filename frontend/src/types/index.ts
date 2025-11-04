export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface Country {
  id: number;
  name: string;
  capital: string;
  continent: string;
}

