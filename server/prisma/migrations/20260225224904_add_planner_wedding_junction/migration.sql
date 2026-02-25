-- CreateTable
CREATE TABLE "PlannerWedding" (
    "plannerId" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerWedding_pkey" PRIMARY KEY ("plannerId","weddingId")
);

-- AddForeignKey
ALTER TABLE "PlannerWedding" ADD CONSTRAINT "PlannerWedding_plannerId_fkey" FOREIGN KEY ("plannerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerWedding" ADD CONSTRAINT "PlannerWedding_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
