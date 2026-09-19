import assert from "node:assert/strict";import test from "node:test";import {kstDateKey,updateStudyStreak} from "../app/streak.ts";
test("streak uses KST",()=>assert.equal(kstDateKey(new Date("2026-09-19T15:30:00Z")),"2026-09-20"));
test("same day only counts once",()=>assert.equal(updateStudyStreak(4,"2026-09-19",new Date("2026-09-19T03:00:00Z")).streak,4));
test("next day increments and gaps reset",()=>{assert.equal(updateStudyStreak(4,"2026-09-19",new Date("2026-09-20T03:00:00Z")).streak,5);assert.equal(updateStudyStreak(8,"2026-09-17",new Date("2026-09-20T03:00:00Z")).streak,1)});
