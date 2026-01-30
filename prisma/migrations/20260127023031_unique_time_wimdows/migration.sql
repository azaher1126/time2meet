/*
  Warnings:

  - A unique constraint covering the columns `[startTime,endTime]` on the table `MeetingTimeWindow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MeetingTimeWindow_startTime_endTime_key" ON "MeetingTimeWindow"("startTime", "endTime");
