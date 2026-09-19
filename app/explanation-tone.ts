/** 사용자에게 보이는 해설을 한 가지 존댓말 톤으로 맞춥니다. */
export function friendlyExplanation(explanation: string) {
  return explanation
    .replace(/아니다\./g, "아닙니다.")
    .replace(/이다\./g, "입니다.")
    .replace(/된다\./g, "됩니다.")
    .replace(/한다\./g, "합니다.")
    .replace(/있다\./g, "있습니다.")
    .replace(/없다\./g, "없습니다.")
    .replace(/않다\./g, "않습니다.")
    .replace(/같다\./g, "같습니다.")
    .replace(/높다\./g, "높습니다.")
    .replace(/낮다\./g, "낮습니다.")
    .replace(/크다\./g, "큽니다.")
    .replace(/작다\./g, "작습니다.");
}

