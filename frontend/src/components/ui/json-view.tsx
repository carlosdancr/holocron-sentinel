// Syntax highlighting para JSON usando regex
// Classes CSS definidas em globals.css: .k (chave), .s (string), .n (numero), .b (boolean/null)
function highlightJson(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2)
  if (!json) return ''

  return json
    .replace(/("[\w_]+")(\s*:)/g, '<span class="k">$1</span>$2')
    .replace(/: (".*?")/g, ': <span class="s">$1</span>')
    .replace(/: (\d+(\.\d+)?)/g, ': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="b">$1</span>')
}

interface JsonViewProps {
  data: unknown
}

export function JsonView({ data }: JsonViewProps) {
  return <pre className="json-block" dangerouslySetInnerHTML={{ __html: highlightJson(data) }} />
}
