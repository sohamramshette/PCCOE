import React from 'react';
import { FeatureAuditItem } from '../../types/scenario';
import { formatNumber } from '../../utils/formatters';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface FeatureAuditTableProps {
  auditItems: FeatureAuditItem[];
}

export const FeatureAuditTable: React.FC<FeatureAuditTableProps> = ({ auditItems }) => {
  if (!auditItems || auditItems.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
        No core features were modified by this intervention configuration.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Core Feature</th>
            <th>Classification</th>
            <th>Baseline Value</th>
            <th>Counterfactual Value</th>
            <th>Delta</th>
            <th>Applied Transformation</th>
          </tr>
        </thead>
        <tbody>
          {auditItems.map((item, idx) => (
            <tr key={`${item.feature_name}-${idx}`}>
              <td>
                <code
                  style={{
                    backgroundColor: '#f1f5f9',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#1d4ed8',
                  }}
                >
                  {item.feature_name}
                </code>
              </td>
              <td>
                <ProvenanceBadge classification={item.classification} />
              </td>
              <td>{formatNumber(item.baseline_value, 4)}</td>
              <td>{formatNumber(item.counterfactual_value, 4)}</td>
              <td style={{ color: item.delta < 0 ? '#10b981' : item.delta > 0 ? '#f59e0b' : 'inherit' }}>
                {item.delta > 0 ? '+' : ''}
                {formatNumber(item.delta, 4)}
              </td>
              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.transformation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
