import { prisma } from "./db";
import { UsageType } from "@prisma/client";

const CREDIT_LIMITS = {
  GUEST: {
    AUDIO_GENERATION: 10,
    DOCUMENT_PROCESSING: 20,
    CONTEXT_TOKENS: 4000,
  },
  USER: {
    AUDIO_GENERATION: 50,
    DOCUMENT_PROCESSING: 100,
    CONTEXT_TOKENS: 16000,
  },
};

const GUEST_INITIAL_CREDITS = 100;
const GUEST_EXPIRY_DAYS = 7;

const HISTORY_RETENTION_DAYS = {
  GUEST: 7,
  USER: 30,
};

export class CreditManager {
  static async initializeGuestCredits(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: GUEST_INITIAL_CREDITS,
        creditHistory: {
          create: {
            amount: GUEST_INITIAL_CREDITS,
            operation: "ADD",
            description: "Initial guest credits",
          },
        },
      },
    });
  }

  static async checkCredits(
    userId: string,
    usageType: UsageType,
    amount: number
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await prisma.usage.aggregate({
      where: {
        userId,
        type: usageType,
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const currentUsage = monthlyUsage._sum.amount || 0;
    const limit = user.isGuest
      ? CREDIT_LIMITS.GUEST[usageType]
      : CREDIT_LIMITS.USER[usageType];

    if (currentUsage + amount > limit) {
      return false;
    }

    return user.credits >= amount;
  }

  static async useCredits(
    userId: string,
    usageType: UsageType,
    amount: number,
    notebookId?: string
  ): Promise<boolean> {
    if (!(await this.checkCredits(userId, usageType, amount))) {
      return false;
    }

    await prisma.$transaction(async (tx) => {
      // Record usage
      await tx.usage.create({
        data: {
          userId,
          type: usageType,
          amount,
          notebookId,
        },
      });

      // Deduct credits
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });

      // Record credit history
      await tx.creditHistory.create({
        data: {
          userId,
          amount,
          operation: "SUBTRACT",
          description: `Used ${amount} credits for ${usageType}`,
        },
      });
    });

    return true;
  }

  static async getUsageSummary(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.usage.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const limits = user.isGuest ? CREDIT_LIMITS.GUEST : CREDIT_LIMITS.USER;

    return Object.values(UsageType).map((type) => {
      const typeUsage = usage.find((u) => u.type === type);
      return {
        type,
        used: typeUsage?._sum.amount || 0,
        limit: limits[type],
      };
    });
  }
}
