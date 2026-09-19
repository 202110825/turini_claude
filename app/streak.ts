const KST=9*60*60*1000;
export const kstDateKey=(now=new Date())=>new Date(now.getTime()+KST).toISOString().slice(0,10);
const day=(key:string)=>/^\d{4}-\d{2}-\d{2}$/.test(key)?Math.floor(Date.parse(`${key}T00:00:00Z`)/86400000):null;
export function updateStudyStreak(value:number,last:string|undefined,now=new Date()){const today=kstDateKey(now),t=day(today)!,p=last?day(last):null,s=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;if(p===t)return {streak:s,lastStudyDate:today};if(p===t-1)return {streak:s+1,lastStudyDate:today};return {streak:1,lastStudyDate:today};}
