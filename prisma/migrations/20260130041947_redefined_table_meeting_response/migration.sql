/*
  Warnings:

  - Made the column `name` on table `MeetingResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeetingResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,
    CONSTRAINT "MeetingResponse_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MeetingResponse" ("id", "meetingId", "name", "userId") SELECT "id", "meetingId", "name", "userId" FROM "MeetingResponse";
DROP TABLE "MeetingResponse";
ALTER TABLE "new_MeetingResponse" RENAME TO "MeetingResponse";
CREATE UNIQUE INDEX "MeetingResponse_meetingId_name_key" ON "MeetingResponse"("meetingId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
