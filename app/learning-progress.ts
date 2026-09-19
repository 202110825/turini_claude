/** 진단 문항 ID 등 학습 데이터에 없는 기록을 푼 문제 수에서 제거합니다. */
export function retainLearningQuestionIds(completedIds: unknown, learningIds: Set<string>) {
  if (!Array.isArray(completedIds)) return [];
  return [...new Set(completedIds.filter((id): id is string => typeof id === "string" && learningIds.has(id)))];
}

