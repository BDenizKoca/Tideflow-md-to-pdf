export function mdToTypst(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        return '='.repeat(level) + ' ' + match[2];
      }
      return line;
    })
    .join('\n');
}
