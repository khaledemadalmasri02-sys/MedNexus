import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

interface AIContentProps {
  content: string;
  accentColor?: string;
  compact?: boolean;
}

const defaultColor = "#8B5CF6";

export function AIContent({ content, accentColor = defaultColor, compact = false }: AIContentProps) {
  const color = accentColor;
  const fs = compact ? "text-xs" : "text-sm";
  const h1Size = compact ? "text-base" : "text-lg";
  const h2Size = compact ? "text-sm" : "text-base";
  const h3Size = compact ? "text-xs" : "text-sm";
  const pMb = compact ? "mb-1.5" : "mb-2.5";
  const ulMb = compact ? "mb-1.5" : "mb-2.5";

  const components: Components = {
    h1: ({ children, ...props }) => (
      <h1 className={`${h1Size} font-bold mb-2 mt-1`} style={{ color }} {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className={`${h2Size} font-bold mb-2 mt-3 flex items-center gap-2 first:mt-0`} style={{ color }} {...props}>
        <span className="w-0.5 h-4 rounded-full shrink-0" style={{ background: color }} />
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className={`${h3Size} font-semibold mb-1.5 mt-2`} style={{ color: "var(--text-primary)" }} {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className={`${h3Size} font-semibold mb-1 mt-2`} style={{ color: "var(--text-primary)" }} {...props}>
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className={`${pMb} leading-relaxed ${fs}`} style={{ color: "var(--text-secondary)" }} {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className={`${ulMb} space-y-1 list-none`} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={`${ulMb} space-y-1 list-decimal list-inside ${fs}`} style={{ color: "var(--text-secondary)" }} {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="flex items-start gap-2" {...props}>
        <span className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ background: color }} />
        <span>{children}</span>
      </li>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-bold" style={{ color: "var(--text-primary)" }} {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic" style={{ color }} {...props}>
        {children}
      </em>
    ),
    blockquote: ({ children, ...props }) => {
      const text = String(children).toLowerCase();
      let borderColor = color;
      let bgColor = `${color}08`;

      if (text.includes("warning") || text.includes("caution") || text.includes("important")) {
        borderColor = "var(--accent-amber)";
        bgColor = "rgba(245, 158, 11, 0.06)";
      } else if (text.includes("note") || text.includes("tip")) {
        borderColor = "var(--accent-blue)";
        bgColor = "rgba(59, 130, 246, 0.06)";
      }

      return (
        <blockquote
          className={`${pMb} pl-3 py-1 rounded-r-lg ${fs}`}
          style={{ borderLeft: `3px solid ${borderColor}`, background: bgColor, color: borderColor }}
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    table: ({ children, ...props }) => (
      <div className={`${pMb} overflow-x-auto rounded-lg`} style={{ border: `1px solid ${color}20` }}>
        <table className={`w-full ${fs}`} {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead style={{ background: `${color}12` }} {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide"
        style={{ color: "var(--text-primary)", borderBottom: `2px solid ${color}30` }}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        className="px-3 py-2"
        style={{ color: "var(--text-secondary)", borderBottom: `1px solid ${color}10` }}
        {...props}
      >
        {children}
      </td>
    ),
    code: ({ children, className, ...props }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <div className={`${pMb} rounded-lg overflow-hidden`} style={{ border: `1px solid ${color}20` }}>
            <div className="px-3 py-1.5 text-[10px] font-semibold" style={{ background: `${color}15`, color }}>
              {className?.replace("language-", "") || "code"}
            </div>
            <pre className="p-3 overflow-x-auto text-xs" style={{ background: "var(--bg-void)" }}>
              <code style={{ color: "var(--text-secondary)" }} {...props}>{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ background: `${color}15`, color }}
          {...props}
        >
          {children}
        </code>
      );
    },
    a: ({ children, ...props }) => (
      <a className="underline font-medium" style={{ color }} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
    hr: () => (
      <hr className="my-3" style={{ borderColor: `${color}20` }} />
    ),
  };

  return (
    <div className="ai-content w-full min-w-0 overflow-hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
