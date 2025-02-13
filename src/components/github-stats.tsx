"use client";

import { useEffect, useState } from "react";
import { Star, GitFork } from "lucide-react";

interface GitHubStats {
  stars: number;
  forks: number;
}

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
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4" />
        <span className="text-sm">{stats.stars}</span>
      </div>
      <div className="flex items-center gap-1">
        <GitFork className="h-4 w-4" />
        <span className="text-sm">{stats.forks}</span>
      </div>
    </div>
  );
}
