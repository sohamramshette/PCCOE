import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  Play,
  Filter,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { getAlerts, getAlertSummary, evaluateAlerts } from '../api/alerts';
import { getStations } from '../api/stations';
import { AlertItem, AlertSummary, AlertFilters } from '../types/alert';
import { Station } from '../types/station';
import { AlertTable } from '../components/alerts/AlertTable';
import { AlertCard } from '../components/alerts/AlertCard';
import { AlertDetailModal } from '../components/alerts/AlertDetailModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { formatDateTime } from '../utils/formatters';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);

  // Filters state
  const stationIdParam = searchParams.get('station_id');
  const [selectedStationId, setSelectedStationId] = useState<string>(stationIdParam || '');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_LIMIT = 25;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AlertFilters = {
        limit: PAGE_LIMIT,
        offset: (page - 1) * PAGE_LIMIT,
        order: 'desc',
      };
      if (selectedStationId) filters.station_id = parseInt(selectedStationId, 10);
      if (selectedType) filters.alert_type = selectedType;
      if (selectedSeverity) filters.severity = selectedSeverity;
      if (selectedStatus) filters.status = selectedStatus;

      const [alertsRes, summaryRes, stationsRes] = await Promise.all([
        getAlerts(filters),
        getAlertSummary(),
        getStations(true),
      ]);

      setAlerts(alertsRes.items || []);
      setTotalPages(alertsRes.pages || 1);
      setTotalCount(alertsRes.total || 0);
      setSummary(summaryRes);
      setStations(stationsRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStationId, selectedType, selectedSeverity, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      setEvaluationFeedback(null);
      const res = await evaluateAlerts(false);
      setEvaluationFeedback(
        `Sweep completed across ${res.stations_evaluated} stations: ${res.alerts_created} new alerts, ${res.alerts_updated} updated, ${res.alerts_resolved} resolved.`
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Evaluation trigger failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleViewOnTwin = (stationId: number) => {
    navigate(`/digital-twin?station=${stationId}`);
  };

  const handleAlertUpdated = (updated: AlertItem) => {
    setSelectedAlert(updated);
    setAlerts((prev) =>
      prev.map((a) => (a.alert_id === updated.alert_id ? updated : a))
    );
    // Reload summary
    getAlertSummary().then(setSummary).catch(() => {});
  };

  const handleResetFilters = () => {
    setSelectedStationId('');
    setSelectedType('');
    setSelectedSeverity('');
    setSelectedStatus('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedStationId || selectedType || selectedSeverity || selectedStatus !== ''
  );

  return (
    <div className="page-container">
      {/* Header section */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                <Activity size={22} />
              </span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Environmental Alert & Anomaly Engine
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Autonomous detection of multi-pollutant threshold breaches, rapid PM2.5 surges, statistical anomalies, and atmospheric stagnation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadData()}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunEvaluation}
              disabled={evaluating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
            >
              <Play size={14} />
              <span>{evaluating ? 'Evaluating...' : 'Run Detection Sweep'}</span>
            </button>
          </div>
        </div>
      </div>

      {evaluationFeedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            color: '#166534',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{evaluationFeedback}</span>
        </div>
      )}

      {error && <ErrorDisplay message={error} onRetry={loadData} />}

      {/* Summary Metrics Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Active Alerts */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '4px solid var(--danger)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Anomaly Alerts
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
              {summary.active_alerts}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {summary.acknowledged_alerts} acknowledged · {summary.resolved_alerts} resolved
            </div>
          </div>

          {/* Critical / High Breakdown */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '4px solid #c2410c',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Critical & High Severity
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c2410c', marginTop: '0.3rem' }}>
              {(summary.by_severity['CRITICAL'] || 0) + (summary.by_severity['HIGH'] || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {summary.by_severity['CRITICAL'] || 0} Critical · {summary.by_severity['HIGH'] || 0} High
            </div>
          </div>

          {/* Medium / Moderate Breakdown */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Medium Severity
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#92400e', marginTop: '0.3rem' }}>
              {summary.by_severity['MEDIUM'] || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Elevated or threshold watch level
            </div>
          </div>

          {/* Network Health */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '4px solid var(--primary)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Monitoring Stations
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
              {stations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Last Evaluated: {summary.last_evaluated_at ? formatDateTime(summary.last_evaluated_at) : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Filter size={15} />
            <span>Filters:</span>
          </div>

          {/* Station Filter */}
          <select
            value={selectedStationId}
            onChange={(e) => {
              setSelectedStationId(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <option value="">All Stations ({stations.length})</option>
            {stations.map((s) => (
              <option key={s.station_id} value={s.station_id}>
                {s.station_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <option value="">All Statuses (Active, Ack, Resolved)</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="INFO">INFO</option>
          </select>

          {/* Alert Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <option value="">All Anomaly Types</option>
            <option value="PM25_THRESHOLD">PM2.5 Threshold</option>
            <option value="PM10_THRESHOLD">PM10 Threshold</option>
            <option value="PM25_SPIKE">PM2.5 Sudden Spike</option>
            <option value="PM25_ANOMALY">Statistical PM2.5 Anomaly</option>
            <option value="FORECAST_DEVIATION">Forecast Deviation</option>
            <option value="ATMOSPHERIC_STAGNATION">Atmospheric Stagnation</option>
            <option value="LOW_WIND">Low Surface Wind</option>
            <option value="LOW_PBL">Low Boundary Layer</option>
            <option value="SENSOR_OFFLINE">Sensor Offline</option>
            <option value="DATA_GAP">Data Gap</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
          >
            Table
          </button>
          <button
            type="button"
            className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('cards')}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Scanning environmental telemetry for alerts and anomalies..." />
      ) : viewMode === 'table' ? (
        <AlertTable
          alerts={alerts}
          onSelectAlert={(a) => setSelectedAlert(a)}
          onViewOnTwin={handleViewOnTwin}
          onResetFilters={handleResetFilters}
        />
      ) : alerts.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            No Alerts Found
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            No environmental anomalies match the current filter criteria.
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetFilters}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            Clear / Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {alerts.map((alert) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              onClick={(a) => setSelectedAlert(a)}
              onViewOnMap={handleViewOnTwin}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing page {page} of {totalPages} ({totalCount} total alerts)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAlertUpdated={handleAlertUpdated}
        />
      )}
    </div>
  );
};
