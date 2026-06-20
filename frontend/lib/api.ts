import { getAuthToken, removeAuthToken, setAuthToken } from "./auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

export type User = {
  id: string;
  username: string;
  businessName?: string;
  BusinessName?: string;
  createdAt: string;
};

export type Employee = {
  id: string;
  userId: string;
  name: string;
  role: string;
  hourlyWage: number;
};

export type ApiShift = {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  isOptimised?: boolean;
  station?: string;
};

export type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type TimetableShift = {
  id: string;
  employeeId: string;
  station: string;
  day: DayName;
  start: string;
  end: string;
  colIndex?: number;
  totalCols?: number;
};

export type WeekDemand = {
  date: string;
  hourlyNeeds: Record<string, number>;
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.code ?? "API_ERROR");
  }

  return data as T;
}

export const shiftToTimetableShift = (shift: ApiShift): TimetableShift => {
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);

  return {
    id: shift.id,
    employeeId: shift.employeeId,
    station: shift.station ?? "Register",
    day: startDate.toLocaleDateString("en-US", { weekday: "short" }) as DayName,
    start: startDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    end: endDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
};

export const api = {
  async signup(input: {
    username: string;
    password: string;
    businessName: string;
  }) {
    const data = await apiFetch<{ success: boolean; code: string; token: string; user: User }>(
      "api/user/signup",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );

    setAuthToken(data.token);
    return data;
  },

  async login(input: {
    username: string;
    password: string;
  }) {
    const data = await apiFetch<{ success: boolean; code: string; token: string; user: User }>(
      "api/user/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );

    setAuthToken(data.token);
    return data;
  },

  logout() {
    removeAuthToken();
  },

  me() {
    return apiFetch<{ success: boolean; code: string; user: User }>("api/user/me");
  },

  updateMe(input: {
    username?: string;
    password?: string;
    businessName?: string;
  }) {
    return apiFetch<{ success: boolean; code: string; user: User }>("api/user/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  listEmployees() {
    return apiFetch<{ success: boolean; code: string; employees: Employee[] }>("api/employee");
  },

  getEmployee(id: string) {
    return apiFetch<{ success: boolean; code: string; employee: Employee }>(`api/employee/${id}`);
  },

  createEmployee(input: {
    name: string;
    role: string;
    hourlyWage: number;
  }) {
    return apiFetch<{ success: boolean; code: string; employee: Employee }>("api/employee", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateEmployee(
    id: string,
    input: {
      name?: string;
      role?: string;
      hourlyWage?: number;
    }
  ) {
    return apiFetch<{ success: boolean; code: string; employee: Employee }>(`api/employee/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteEmployee(id: string) {
    return apiFetch<{ success: boolean; code: string; id: string }>(`api/employee/${id}`, {
      method: "DELETE",
    });
  },

  listShifts() {
    return apiFetch<{ success: boolean; code: string; shifts: ApiShift[] }>("api/shift/allShifts");
  },

  getShift(id: string) {
    return apiFetch<{ success: boolean; code: string; shift: ApiShift }>(`api/shift/${id}`);
  },

  createShift(input: {
    employeeId: string;
    startTime: string;
    endTime: string;
    station?: string;
  }) {
    return apiFetch<{ success: boolean; code: string; shift: ApiShift }>("api/shift/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateShift(
    id: string,
    input: {
      employeeId: string;
      newStartTime: string;
      newEndTime: string;
      station?: string;
    }
  ) {
    return apiFetch<{ success: boolean; code: string; shift: ApiShift }>(`api/shift/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  deleteShift(id: string) {
    return apiFetch<{ success: boolean; code: string; message: string }>(`api/shift/${id}`, {
      method: "DELETE",
    });
  },

  getDashboardMetrics() {
    return apiFetch<{
      success: boolean;
      code: string;
      totalMoneySaved: number;
      totalHoursOptimized: number;
      totalRuns: number;
    }>("api/activityLog/metrics");
  },

  getRecentLogs() {
    return apiFetch<{
      success: boolean;
      code: string;
      logs: unknown[];
    }>("api/activityLog/recent");
  },

  optimise(input: { weekDemand: WeekDemand[] }) {
    return apiFetch<{
      success: boolean;
      code: string;
      shiftsGenerated: number;
      estimatedOldCost: number;
      totalCost: number;
      moneySaved: number;
    }>("api/optimisation/optimise", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};