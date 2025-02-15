"use client";

import { useEffect, useState } from "react";
import { UsageType } from "@prisma/client";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { mockUsageSummary } from "@/lib/mock-data";

interface UsageSummary {
  type: UsageType;
  used: number;
  limit: number;
}

export function CreditStatus() {
  const [usageSummary, setUsageSummary] = useState<UsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call with mock data
    const fetchUsage = async () => {
      try {
        // In production, this would be a real API call
        // const response = await fetch("/api/credits/usage");
        // const data = await response.json();
        setUsageSummary(mockUsageSummary);
      } catch (err) {
        setError("Failed to load credit usage");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
    // Refresh every minute
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded-lg" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-warning";
    return "bg-primary";
  };

  const formatUsageType = (type: UsageType) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold">Credit Usage</h3>
      <div className="space-y-6">
        {usageSummary.map((usage) => (
          <div key={usage.type} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatUsageType(usage.type)}</span>
              <span>
                {usage.used} / {usage.limit}
              </span>
            </div>
            <Progress
              value={(usage.used / usage.limit) * 100}
              className={getUsageColor(usage.used, usage.limit)}
            />
            {usage.used >= usage.limit * 0.9 && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Credit Limit Warning</AlertTitle>
                <AlertDescription>
                  You are approaching your {formatUsageType(usage.type)} limit.
                  {usage.used >= usage.limit
                    ? " You will not be able to perform more operations of this type."
                    : " Consider upgrading your account for more credits."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
