/*
  Warnings:

  - You are about to drop the column `startdate` on the `Meeting` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `Meeting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meeting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "timeWindowId" INTEGER,
    "creatorId" INTEGER,
    "shareLink" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meeting_timeWindowId_fkey" FOREIGN KEY ("timeWindowId") REFERENCES "MeetingTimeWindow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meeting" ("createdAt", "creatorId", "description", "endDate", "id", "isPrivate", "location", "shareLink", "timeWindowId", "title") SELECT "createdAt", "creatorId", "description", "endDate", "id", "isPrivate", "location", "shareLink", "timeWindowId", "title" FROM "Meeting";
DROP TABLE "Meeting";
ALTER TABLE "new_Meeting" RENAME TO "Meeting";
CREATE UNIQUE INDEX "Meeting_shareLink_key" ON "Meeting"("shareLink");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
