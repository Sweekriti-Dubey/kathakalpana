export function tokenizeContent(text: string): string[] {
  return text.split(/(\s+)/);
}

export function getCleanWord(token: string): string {
  return token.replace(/[.,\/#!$%^&*;:{}=\-_`~()""'']/g, '').toLowerCase();
}

export function isClickableWord(token: string): boolean {
  if(token.trim().length === 0) return false;
  if(getCleanWord(token).length ===0) return false;
  return true;
}