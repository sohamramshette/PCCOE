import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSyncStatus, triggerOpenAQSync } from '../../api/sync';

import { SyncStatusResponse, OpenAQSyncResponse } from '../../types/sync';

interface SyncWidgetProps {
  onSyncCompleted?: (result: OpenAQSyncResponse) => void;
}

export const SyncWidget: React.FC<SyncWidgetProps> = ({ onSyncCompleted }) => {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await getSyncStatus();
      setStatus(res);
    } catch (err: any) {
      console.error('Failed to load sync status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll sync health every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setLastResult(null);

    try {
      const result = await triggerOpenAQSync();
      setLastResult(
        `Synced ${result.stations_successful} stations (${result.records_ingested} ingested, ${result.records_updated} updated)`
      );
      await fetchStatus();
      if (onSyncCompleted) {
        onSyncCompleted(result);
      }
    } catch (err: any) {
      console.error('OpenAQ sync failed:', err);
      setErrorMsg(err.message || 'Sync failed. Please check network/API status.');
    } finally {
      setSyncing(false);
    }
  };

  const isOnline = status?.service_status === 'ONLINE';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 14px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Live Pipeline Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            position: 'relative',
            display: 'flex',
            height: '10px',
            width: '10px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              display: 'inline-flex',
              height: '100%',
              width: '100%',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#f59e0b',
              opacity: 0.75,
              animation: isOnline ? 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
            }}
          />
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              borderRadius: '50%',
              height: '10px',
              width: '10px',
              backgroundColor: isOnline ? '#059669' : '#d97706',
            }}
          />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            OpenAQ Live Telemetry
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            {status?.last_sync_timestamp_utc
              ? `Synced: ${new Date(status.last_sync_timestamp_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Pipeline Ready'}
          </span>
        </div>
      </div>

      {/* Sync Action Button */}
      <button
        onClick={handleSyncNow}
        disabled={syncing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: syncing ? '#e2e8f0' : '#2563eb',
          color: syncing ? '#64748b' : '#ffffff',
          border: 'none',
          fontSize: '12px',
          fontWeight: 600,
          cursor: syncing ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Trigger live sync from OpenAQ API v3"
      >
        <RefreshCw
          size={13}
          style={{
            animation: syncing ? 'spin 1s linear infinite' : 'none',
          }}
        />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {/* Feedback Messages */}
      {lastResult && (
        <span
          style={{
            fontSize: '11px',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={13} />
          {lastResult}
        </span>
      )}
      {errorMsg && (
        <span
          style={{
            fontSize: '11px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={13} />
          {errorMsg}
        </span>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
