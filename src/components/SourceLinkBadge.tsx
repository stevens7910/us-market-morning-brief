import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { SourceLink } from '../types/edition';

interface SourceLinkBadgeProps {
  source: SourceLink;
}

export function isSecPrimarySource(name: string): boolean {
  return /\bsec\b/i.test(name) || name.toUpperCase().includes('SEC');
}

export function SourceLinkBadge({ source }: SourceLinkBadgeProps) {
  const isSec = isSecPrimarySource(source.name);

  if (isSec) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Oficiální primární regulatorní hlášení SEC EDGAR"
        className="inline-flex items-center gap-1.5 border border-ft-claret/40 bg-ft-claret-tint px-2 py-0.5 text-xs font-semibold text-ft-claret hover:bg-ft-claret hover:text-white transition-colors"
      >
        <ShieldCheck className="h-3.5 w-3.5 flex-none" />
        <span>{source.name}</span>
        <ExternalLink className="h-3 w-3 flex-none opacity-80" />
      </a>
    );
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-ft-claret hover:text-ft-claret-dark underline decoration-ft-claret/40 underline-offset-2"
    >
      <span>{source.name}</span>
      <ExternalLink className="h-3 w-3 flex-none" />
    </a>
  );
}
