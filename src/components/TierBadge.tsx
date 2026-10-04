export function TierBadge({ tier }: { tier: 'foundation' | 'core' | 'advanced' }) {
  return <span className={`dz-badge dz-badge-${tier}`}>{tier}</span>;
}
