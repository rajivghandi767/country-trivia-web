import { useState, useEffect } from "react";

export interface PortfolioProject {
  title: string;
  deployed_url: string;
  description: string;
  technology: string;
  emoji?: string;
}

export interface PortfolioInfo {
  github_url: string;
  email: string;
}

const PORTFOLIO_API_BASE = "https://portfolio-api.rajivwallace.com/api";

function extractResults<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (
    typeof payload === "object" &&
    payload !== null &&
    "results" in payload &&
    Array.isArray(payload.results)
  ) {
    return payload.results as T[];
  }
  return [];
}

let projectsPromise: Promise<PortfolioProject[]> | null = null;
let infoPromise: Promise<PortfolioInfo | null> | null = null;

function fetchProjectsOnce(): Promise<PortfolioProject[]> {
  projectsPromise ??= fetch(`${PORTFOLIO_API_BASE}/projects/`)
    .then((res) => res.json() as Promise<unknown>)
    .then((data) => extractResults<PortfolioProject>(data))
    .catch((err: unknown) => {
      console.error(err);
      projectsPromise = null;
      return [];
    });
  return projectsPromise;
}

function fetchInfoOnce(): Promise<PortfolioInfo | null> {
  infoPromise ??= fetch(`${PORTFOLIO_API_BASE}/info/`)
    .then((res) => res.json() as Promise<unknown>)
    .then((data) => {
      const results = extractResults<PortfolioInfo>(data);
      return results.length > 0 ? results[0] : null;
    })
    .catch((err: unknown) => {
      console.error(err);
      infoPromise = null;
      return null;
    });
  return infoPromise;
}

export function usePortfolioData() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [info, setInfo] = useState<PortfolioInfo | null>(null);

  useEffect(() => {
    let isMounted = true;

    void fetchProjectsOnce().then((items) => {
      if (isMounted) {
        setProjects(items);
      }
    });

    void fetchInfoOnce().then((item) => {
      if (isMounted && item) {
        setInfo(item);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { projects, info };
}

