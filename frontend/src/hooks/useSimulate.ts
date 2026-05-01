import { useState } from "react";
import axios from "axios";
import { SimRequest, SimResponse, ExploreRequest, ExploreResponse, SessionDetail } from "../types/api";

const BASE = "/api";

export function useSimulate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResponse | null>(null);

  const run = async (req: SimRequest) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<SimResponse>(`${BASE}/simulate`, req);
      setResult(data);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : String(e);
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error, result };
}

export function useExplore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExploreResponse | null>(null);

  const run = async (req: ExploreRequest) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<ExploreResponse>(`${BASE}/explore`, req);
      setResult(data);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : String(e);
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error, result };
}

export function useSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SessionDetail | null>(null);

  const fetch = async (index: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<SessionDetail>(`${BASE}/session/${index}`);
      setResult(data);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail ?? e.message : String(e);
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return { fetch, loading, error, result };
}
