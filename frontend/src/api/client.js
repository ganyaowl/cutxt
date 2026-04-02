import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const api = axios.create({ baseURL });

export function formatApiError(error) {
  const detail = error.response?.data?.detail;
  if (detail == null) {
    return error.message || "Request failed";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "object" ? item.msg || JSON.stringify(item) : String(item)))
      .join("; ");
  }
  return String(detail);
}
