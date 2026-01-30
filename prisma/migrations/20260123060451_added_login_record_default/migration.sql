-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoginRecord" (
    "userId" INTEGER NOT NULL,
    "loggedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    PRIMARY KEY ("userId", "loggedInAt"),
    CONSTRAINT "LoginRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LoginRecord" ("ipAddress", "loggedInAt", "userAgent", "userId") SELECT "ipAddress", "loggedInAt", "userAgent", "userId" FROM "LoginRecord";
DROP TABLE "LoginRecord";
ALTER TABLE "new_LoginRecord" RENAME TO "LoginRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
