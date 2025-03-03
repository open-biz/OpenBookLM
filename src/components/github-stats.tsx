"use client";

import { useEffect, useState } from "react";
import { Star, GitFork } from "lucide-react";
import Link from "next/link";

interface GitHubStats {
  stars: number;
  forks: number;
  fullName: string;
}

const REPO_URL = "https://github.com/open-biz/OpenBookLM";

export function GitHubStats() {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/open-biz/OpenBookLM");
        if (!response.ok) {
          throw new Error("Failed to fetch GitHub stats");
        }
        const data = await response.json();
        setStats({
          stars: data.stargazers_count,
          forks: data.forks_count,
          fullName: data.full_name,
        });
      } catch (err) {
        setError("Failed to load stats");
        console.error("Error fetching GitHub stats:", err);
      }
    };

    fetchStats();
  }, []);

  if (error) return null;
  if (!stats) return null;

  return (
    <div className="flex items-center gap-2 border-l border-gray-700 ml-2 pl-2">
      <span className="text-sm font-medium">{stats.fullName}</span>
      <Link
        href={`${REPO_URL}/stargazers`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 hover:text-primary transition-colors"
        title="Star this repository"
      >
        <Star className="h-4 w-4" />
        <span className="text-sm">{stats.stars}</span>
      </Link>
      <Link
        href={`${REPO_URL}/fork`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 hover:text-primary transition-colors"
        title="Fork this repository"
      >
        <GitFork className="h-4 w-4" />
        <span className="text-sm">{stats.forks}</span>
      </Link>
    </div>
  );
}
