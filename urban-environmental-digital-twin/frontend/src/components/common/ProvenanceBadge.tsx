import React from 'react';
import { getProvenanceMeta } from '../../utils/provenance';

interface ProvenanceBadgeProps {
  classification?: string | null;
  showTooltip?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ classification, showTooltip = true }) => {
  const meta = getProvenanceMeta(classification);

  return (
    <span
      className="badge"
      title={showTooltip ? `${meta.category}: ${meta.description}` : undefined}
      style={{
        backgroundColor: meta.bgColor,
        color: meta.color,
        border: `1px solid ${meta.borderColor}`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: meta.color,
          display: 'inline-block',
        }}
      />
      {meta.badge}
    </span>
  );
};
