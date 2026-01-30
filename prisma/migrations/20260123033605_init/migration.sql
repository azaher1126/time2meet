-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" DATETIME,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginRecord" (
    "userId" INTEGER NOT NULL,
    "loggedInAt" DATETIME NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,

    PRIMARY KEY ("userId", "loggedInAt"),
    CONSTRAINT "LoginRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingTimeWindow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startdate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "timeWindowId" INTEGER,
    "creatorId" INTEGER NOT NULL,
    "shareLink" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meeting_timeWindowId_fkey" FOREIGN KEY ("timeWindowId") REFERENCES "MeetingTimeWindow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingInvite" (
    "meetingId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,

    PRIMARY KEY ("meetingId", "email"),
    CONSTRAINT "MeetingInvite_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "MeetingResponse_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingResponseId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    CONSTRAINT "AvailabilitySlot_meetingResponseId_fkey" FOREIGN KEY ("meetingResponseId") REFERENCES "MeetingResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_shareLink_key" ON "Meeting"("shareLink");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingResponse_meetingId_name_key" ON "MeetingResponse"("meetingId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_meetingResponseId_date_startTime_endTime_key" ON "AvailabilitySlot"("meetingResponseId", "date", "startTime", "endTime");
