import { UsageType } from "@prisma/client";

export const mockUsageSummary = [
  {
    type: UsageType.CONTEXT_TOKENS,
    used: 750,
    limit: 1000,
  },
  {
    type: UsageType.AUDIO_GENERATION,
    used: 8,
    limit: 10,
  },
  {
    type: UsageType.IMAGE_GENERATION,
    used: 15,
    limit: 50,
  },
];

export const mockUser = {
  id: "mock-user-id",
  name: "Guest User",
  isGuest: true,
  createdAt: new Date(),
};
