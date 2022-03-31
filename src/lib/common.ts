export function simpleDeepCopy(a: any) {
  return JSON.parse(JSON.stringify(a));
}
