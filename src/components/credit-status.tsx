"use client";

import { useEffect, useState } from "react";
import { UsageType } from "@prisma/client";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Coins, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const fetchUsage = async () => {
      try {
        const response = await fetch("/api/credits/usage");
        if (!response.ok) {
          throw new Error("Failed to fetch usage data");
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid usage data format");
        }
        setUsageSummary(data);
      } catch (err) {
        setError("Failed to load credit usage");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const getAvailableCredits = () => {
    if (!usageSummary.length) return 0;
    
    // Only count non-token credits
    const relevantTypes = usageSummary.filter(
      (usage) => usage.type !== "CONTEXT_TOKENS"
    );
    
    return relevantTypes.reduce((total, usage) => {
      return total + (usage.limit - usage.used);
    }, 0);
  };

  if (loading) {
    return (
      <Button variant="ghost" className="animate-pulse" disabled>
        <Coins className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="destructive" size="sm">
        <AlertCircle className="h-4 w-4 mr-2" />
        Error loading credits
      </Button>
    );
  }

  const availableCredits = getAvailableCredits();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span>{availableCredits} available</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Credit Usage Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {usageSummary.map((usage) => (
            <Card key={usage.type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatUsageType(usage.type)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Used: {usage.used}</span>
                    <span>Available: {usage.limit - usage.used}</span>
                  </div>
                  <Progress
                    value={(usage.used / usage.limit) * 100}
                    className={getUsageColor(usage.used, usage.limit)}
                  />
                  {usage.used >= usage.limit * 0.9 && (
                    <p className="text-xs text-destructive mt-1">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Approaching limit
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Total Credits Available: {availableCredits}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
