-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meeting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startdate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "timeWindowId" INTEGER,
    "creatorId" INTEGER,
    "shareLink" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meeting_timeWindowId_fkey" FOREIGN KEY ("timeWindowId") REFERENCES "MeetingTimeWindow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meeting" ("createdAt", "creatorId", "description", "endDate", "id", "isPrivate", "location", "shareLink", "startdate", "timeWindowId", "title") SELECT "createdAt", "creatorId", "description", "endDate", "id", "isPrivate", "location", "shareLink", "startdate", "timeWindowId", "title" FROM "Meeting";
DROP TABLE "Meeting";
ALTER TABLE "new_Meeting" RENAME TO "Meeting";
CREATE UNIQUE INDEX "Meeting_shareLink_key" ON "Meeting"("shareLink");
CREATE TABLE "new_MeetingResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingId" INTEGER NOT NULL,
    "name" TEXT,
    "userId" INTEGER,
    CONSTRAINT "MeetingResponse_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MeetingResponse" ("id", "meetingId", "name") SELECT "id", "meetingId", "name" FROM "MeetingResponse";
DROP TABLE "MeetingResponse";
ALTER TABLE "new_MeetingResponse" RENAME TO "MeetingResponse";
CREATE UNIQUE INDEX "MeetingResponse_meetingId_name_key" ON "MeetingResponse"("meetingId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
