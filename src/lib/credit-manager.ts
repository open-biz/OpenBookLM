import { prisma } from "./db";
import { CreditType, UsageType } from "@prisma/client";

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

const HISTORY_RETENTION_DAYS = {
  GUEST: 7,
  USER: 30,
};

export class CreditManager {
  static async initializeGuestCredits(userId: string) {
    await prisma.credit.create({
      data: {
        userId,
        amount: CREDIT_LIMITS.GUEST.AUDIO_GENERATION,
        type: CreditType.TRIAL,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
      include: {
        credits: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
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

    const availableCredits = user.credits.reduce(
      (sum, credit) => sum + credit.amount,
      0
    );

    return availableCredits >= amount;
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

      // Deduct from credits
      const credits = await tx.credit.findMany({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: [
          { type: "asc" },
          { expiresAt: "asc" },
        ],
      });

      let remainingAmount = amount;
      for (const credit of credits) {
        if (remainingAmount <= 0) break;

        const deduction = Math.min(remainingAmount, credit.amount);
        await tx.credit.update({
          where: { id: credit.id },
          data: { amount: credit.amount - deduction },
        });
        remainingAmount -= deduction;
      }
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

    const limits = user?.isGuest ? CREDIT_LIMITS.GUEST : CREDIT_LIMITS.USER;

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
