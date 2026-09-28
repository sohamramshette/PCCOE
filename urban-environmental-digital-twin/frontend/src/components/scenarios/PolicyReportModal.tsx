import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  HeartPulse,
  Activity,
  Award,
} from 'lucide-react';
import { PolicyReportResponse } from '../../types/llm';
import { generatePolicyReport } from '../../api/scenarios';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface PolicyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  scenarioName: string;
}

export const PolicyReportModal: React.FC<PolicyReportModalProps> = ({
  isOpen,
  onClose,
  scenarioId,
  scenarioName,
}) => {
  const [report, setReport] = useState<PolicyReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'brief' | 'markdown'>('brief');

  useEffect(() => {
    if (isOpen && scenarioId) {
      loadReport();
    } else {
      setReport(null);
      setError(null);
    }
  }, [isOpen, scenarioId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await generatePolicyReport(scenarioId);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate policy decision brief.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!report?.markdown_content) return;
    navigator.clipboard.writeText(report.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!report?.markdown_content) return;
    const blob = new Blob([report.markdown_content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (scenarioName || 'Policy').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.setAttribute('download', `${safeName}_policy_brief.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict?.toUpperCase()) {
      case 'HIGHLY_RECOMMENDED':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          text: '#059669',
          border: 'rgba(16, 185, 129, 0.4)',
          label: 'Highly Recommended for Implementation',
          icon: <ShieldCheck size={18} className="text-emerald-500" />
        };
      case 'FEASIBLE_WITH_TARGETING':
      case 'RECOMMENDED_WITH_CONDITIONS':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          text: '#2563eb',
          border: 'rgba(59, 130, 246, 0.4)',
          label: 'Feasible with Sectoral Targeting',
          icon: <Check size={18} className="text-blue-500" />
        };
      case 'MODERATE_IMPACT':
      case 'MODERATE_EFFICACY':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#d97706',
          border: 'rgba(245, 158, 11, 0.4)',
          label: 'Moderate Impact — Synergistic Pairing Advised',
          icon: <Activity size={18} className="text-amber-500" />
        };
      case 'LOW_RETURN':
      case 'LOW_FEASIBILITY_HIGH_COST':
      default:
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#dc2626',
          border: 'rgba(239, 68, 68, 0.4)',
          label: 'Low Return — High Friction Relative to Gain',
          icon: <AlertTriangle size={18} className="text-red-500" />
        };
    }
  };

  const verdictStyle = report ? getVerdictStyle(report.verdict) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Policy Decision Brief
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Sparkles size={11} /> Gemini 3.1
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                {scenarioName} • Multi-Lever Municipal Climate Assessment
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report && (
              <>
                <button
                  onClick={handleCopyMarkdown}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                  title="Copy full brief in Markdown"
                >
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="btn btn-primary"
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                  title="Download .md file"
                >
                  <Download size={15} />
                  <span>Download .md</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          {loading && (
            <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
              <LoadingSpinner message="Gemini AI is synthesizing multi-lever policy impacts, health gains, and municipal roadmap..." />
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Applying epidemiological risk ratios and operational feasibility cross-checks...
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                textAlign: 'center',
              }}
            >
              <AlertTriangle size={32} style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Report Generation Issue</h3>
              <p style={{ fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{error}</p>
              <button onClick={loadReport} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Retry Analysis
              </button>
            </div>
          )}

          {report && !loading && (
            <div>
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  marginBottom: '1.25rem',
                }}
              >
                <button
                  onClick={() => setActiveTab('brief')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'brief' ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === 'brief' ? '#6366f1' : 'var(--text-muted)',
                    fontWeight: activeTab === 'brief' ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  Executive Dashboard Brief
                </button>
                <button
                  onClick={() => setActiveTab('markdown')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'markdown' ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === 'markdown' ? '#6366f1' : 'var(--text-muted)',
                    fontWeight: activeTab === 'markdown' ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  Formatted Markdown Document
                </button>
              </div>

              {activeTab === 'brief' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Verdict & Title Banner */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: verdictStyle?.bg,
                      border: `1px solid ${verdictStyle?.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: verdictStyle?.text, fontWeight: 700 }}>
                        Policy Verdict
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: verdictStyle?.text, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        {verdictStyle?.icon}
                        <span>{verdictStyle?.label}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-card, #ffffff)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${verdictStyle?.border}`,
                          color: verdictStyle?.text,
                        }}
                      >
                        Code: {report.verdict}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary Card */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.04)',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <Sparkles size={17} style={{ color: '#6366f1' }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#6366f1' }}>
                        Executive Summary
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                      {report.executive_summary}
                    </p>
                  </div>

                  {/* Two Column Grid: Health Impact & Feasibility */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {/* Health Impact */}
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.04)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <HeartPulse size={18} style={{ color: '#059669' }} />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#059669' }}>
                          Public Health Impact Projection
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                        {report.health_benefit_projection}
                      </p>
                    </div>

                    {/* Economic & Feasibility */}
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(59, 130, 246, 0.04)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <Building2 size={18} style={{ color: '#2563eb' }} />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#2563eb' }}>
                          Economic Feasibility & Governance
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                        {report.economic_and_feasibility_analysis}
                      </p>
                    </div>
                  </div>

                  {/* Phased Action Roadmap */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-main, #f8fafc)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Calendar size={18} style={{ color: '#475569' }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                        Phased Municipal Implementation Roadmap
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {report.action_plan.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '1rem',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-card, #ffffff)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                backgroundColor: idx === 0 ? 'rgba(239, 68, 68, 0.1)' : idx === 1 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: idx === 0 ? '#dc2626' : idx === 1 ? '#2563eb' : '#059669',
                              }}
                            >
                              {item.phase}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--bg-main)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              Lead: <strong>{item.responsible_agency}</strong>
                            </span>
                          </div>

                          <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            {item.action}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#059669' }}>
                            <Award size={14} />
                            <span>Target Metric: <strong>{item.target_metric}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Markdown View */
                <div style={{ position: 'relative' }}>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-main, #0f172a)',
                      color: 'var(--text-main, #f8fafc)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      overflowX: 'auto',
                      fontSize: '0.82rem',
                      lineHeight: 1.6,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: '1px solid var(--border-color, #334155)',
                    }}
                  >
                    {report.markdown_content}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-main, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          <div>
            Urban Environmental Digital Twin • Counterfactual ML Model Serving & Gemini Policy Synthesis
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
