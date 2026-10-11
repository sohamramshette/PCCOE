import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Wind,
  Truck,
  Factory,
  HelpCircle,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  FileText,
  Shield,
  Eye,
  Send,
} from 'lucide-react';

import {
  ReportCategory,
  CitizenReportItem,
  CitizenReportSubmitResponse,
} from '../types/report';
import {
  submitPollutionReport,
  getMyReports,
  ReportSubmissionData,
} from '../api/reports';
import { IncidentLocationPicker } from '../components/map/IncidentLocationPicker';
import { formatLocalIST } from '../utils/residentAlerts';

// Device Token Storage Key
const DEVICE_TOKEN_KEY = 'airlens_reporter_device_token_v1';

function getOrCreateDeviceToken(): string {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token || token.length < 8) {
      token = 'dev-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'dev-guest-token-' + Date.now();
  }
}

interface CategoryOption {
  key: ReportCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    key: 'OPEN_BURNING',
    label: 'Open Waste Burning',
    description: 'Dry leaves, garbage, plastic, or debris burning generating ground-level smoke.',
    icon: <Flame size={18} color="#f97316" />,
  },
  {
    key: 'SMOKE_EMISSIONS',
    label: 'Smoke or Visible Plumes',
    description: 'Dense smoke from chimneys, generators, commercial ovens, or vehicles.',
    icon: <Wind size={18} color="#fb923c" />,
  },
  {
    key: 'CONSTRUCTION_DUST',
    label: 'Construction & Road Dust',
    description: 'Uncovered sand transport, demolition dust, unpaved road dust, or earthworks.',
    icon: <Truck size={18} color="#facc15" />,
  },
  {
    key: 'INDUSTRIAL_EMISSIONS',
    label: 'Industrial Emissions',
    description: 'Unusual smokestack discharge or factory haze in industrial corridors (MIDC).',
    icon: <Factory size={18} color="#38bdf8" />,
  },
  {
    key: 'UNUSUAL_ODOUR',
    label: 'Unusual Odour / Chemical Fumes',
    description: 'Strong acrid, chemical, solvent, or pungent smells lingering in the air.',
    icon: <AlertCircle size={18} color="#c084fc" />,
  },
  {
    key: 'OTHER',
    label: 'Other Pollution Incident',
    description: 'Any other visible or palpable outdoor air pollution incident.',
    icon: <HelpCircle size={18} color="#8aa87e" />,
  },
];

export const ReportPollution: React.FC = () => {
  // Navigation tabs: 'submit' | 'my-reports'
  const [activeTab, setActiveTab] = useState<'submit' | 'my-reports'>('submit');

  // Form State
  const [category, setCategory] = useState<ReportCategory>('OPEN_BURNING');
  const [locationName, setLocationName] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [observedAt, setObservedAt] = useState<string>(() => {
    // Current local ISO string formatted for input datetime-local
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitSuccessResponse, setSubmitSuccessResponse] = useState<CitizenReportSubmitResponse | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // My Reports State
  const [myReports, setMyReports] = useState<CitizenReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<CitizenReportItem | null>(null);

  // Device token
  const deviceToken = getOrCreateDeviceToken();

  // Load resident's previously submitted reports
  const loadMyReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const reports = await getMyReports(deviceToken);
      setMyReports(reports);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingReports(false);
    }
  }, [deviceToken]);

  useEffect(() => {
    if (activeTab === 'my-reports') {
      loadMyReports();
    }
  }, [activeTab, loadMyReports]);

  // Handle Photo selection with preview and client-side validation
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Permitted types
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormErrors((prev) => ({
          ...prev,
          photo: 'Please upload a valid image file (JPEG, PNG, or WebP).',
        }));
        return;
      }
      // Permitted size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          photo: 'Photograph exceeds maximum allowed size of 5 MB.',
        }));
        return;
      }

      setFormErrors((prev) => {
        const { photo, ...rest } = prev;
        return rest;
      });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!category) {
      errors.category = 'Please select a pollution category.';
    }
    if (!locationName.trim() || locationName.trim().length < 3) {
      errors.location = 'Please provide a valid locality, landmark, or street name (min 3 characters).';
    }
    if (!description.trim() || description.trim().length < 5) {
      errors.description = 'Please describe what you observed (min 5 characters).';
    } else if (description.trim().length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.';
    }
    if (!observedAt) {
      errors.observedAt = 'Please select the observation date and time.';
    } else {
      const chosenDate = new Date(observedAt);
      const now = new Date();
      if (chosenDate.getTime() > now.getTime() + 10 * 60 * 1000) {
        errors.observedAt = 'Observation time cannot be in the future.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const submissionData: ReportSubmissionData = {
        category,
        description: description.trim(),
        location_name: locationName.trim(),
        observed_at: new Date(observedAt).toISOString(),
        latitude,
        longitude,
        client_device_token: deviceToken,
      };

      const res = await submitPollutionReport(submissionData, photoFile);
      setSubmitSuccessResponse(res);
      // Reset form fields
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setFormErrors({
        submit: err.message || 'Failed to submit report. Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy reference code to clipboard
  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  return (
    <div className="report-pollution-page citizen-theme" style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
      {/* 1. Header Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(40, 122, 69, 0.1)',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              color: '#166534',
              textTransform: 'uppercase',
            }}
          >
            <Camera size={12} />
            Community Incident Log
          </span>
          <span style={{ fontSize: '0.78rem', color: '#526b59' }}>· Pune &amp; Pimpri-Chinchwad</span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#0d1710', margin: '0 0 0.35rem' }}>
          Report Pollution Incident
        </h1>
        <p style={{ margin: 0, fontSize: '0.92rem', color: '#526b59', maxWidth: '750px', lineHeight: 1.5 }}>
          Help map localized environmental concerns across Pune and PCMC. Submit visible pollution incidents such as
          waste burning, construction dust, or thick smoke to the digital twin log.
        </p>
      </div>

      {/* 2. Top Tabs: Submit vs. My Reports */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(40, 122, 69, 0.18)',
          paddingBottom: '0.65rem',
          marginBottom: '1.75rem',
        }}
      >
        <button
          onClick={() => {
            setActiveTab('submit');
            setSubmitSuccessResponse(null);
          }}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'submit' ? 'none' : '1px solid rgba(40, 122, 69, 0.18)',
            background: activeTab === 'submit' ? '#166534' : 'rgba(255, 255, 255, 0.85)',
            color: activeTab === 'submit' ? '#ffffff' : '#334155',
            fontWeight: activeTab === 'submit' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: activeTab === 'submit' ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={15} />
          <span>Submit a Report</span>
        </button>

        <button
          onClick={() => setActiveTab('my-reports')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: activeTab === 'my-reports' ? 'none' : '1px solid rgba(40, 122, 69, 0.18)',
            background: activeTab === 'my-reports' ? '#166534' : 'rgba(255, 255, 255, 0.85)',
            color: activeTab === 'my-reports' ? '#ffffff' : '#334155',
            fontWeight: activeTab === 'my-reports' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: activeTab === 'my-reports' ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Eye size={15} />
          <span>My Submitted Reports</span>
          {myReports.length > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: activeTab === 'my-reports' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(40, 122, 69, 0.12)',
                color: activeTab === 'my-reports' ? '#ffffff' : '#166534',
                fontWeight: 600,
              }}
            >
              {myReports.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB 1: SUBMIT REPORT OR SUCCESS RECEIPT */}
      {activeTab === 'submit' && (
        <div>
          {submitSuccessResponse ? (
            /* Confirmation Receipt Screen */
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(40, 122, 69, 0.22)',
                borderRadius: '16px',
                padding: '2.25rem 2rem',
                maxWidth: '680px',
                margin: '1rem auto',
                boxShadow: '0 8px 30px rgba(22, 38, 25, 0.08)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1.5px solid #16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#166534',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle2 size={30} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d1710', textAlign: 'center', margin: '0 0 0.4rem' }}>
                Report Submitted Successfully
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#526b59', textAlign: 'center', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                Your pollution incident observation has been registered into the AirLens community log with reference:
              </p>

              {/* Reference Badge Box */}
              <div
                style={{
                  background: 'rgba(240, 253, 244, 0.9)',
                  border: '1.5px dashed rgba(40, 122, 69, 0.45)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#526b59', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Incident Reference Number
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#166534', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                    {submitSuccessResponse.report_reference}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyReference(submitSuccessResponse.report_reference)}
                  style={{
                    background: copiedRef ? 'rgba(34, 197, 94, 0.2)' : '#ffffff',
                    border: '1px solid rgba(40, 122, 69, 0.3)',
                    color: copiedRef ? '#15803d' : '#0d1710',
                    padding: '0.45rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedRef ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedRef ? 'Copied' : 'Copy Ref'}</span>
                </button>
              </div>

              {/* Incident Details Summary */}
              <div
                style={{
                  background: 'rgba(240, 253, 244, 0.65)',
                  borderRadius: '10px',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <span style={{ color: '#526b59' }}>Category:</span>
                  <div style={{ color: '#0d1710', fontWeight: 600, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.category.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#526b59' }}>Location:</span>
                  <div style={{ color: '#0d1710', fontWeight: 600, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.location_name}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#526b59' }}>Observed At:</span>
                  <div style={{ color: '#0d1710', fontWeight: 600, marginTop: '0.15rem' }}>
                    {formatLocalIST(submitSuccessResponse.report.observed_at)}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#526b59' }}>Current Status:</span>
                  <div style={{ color: '#166534', fontWeight: 700, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.status}
                  </div>
                </div>
              </div>

              {/* Legal & Governance Notice */}
              <div
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '8px',
                  background: 'rgba(254, 243, 199, 0.6)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontSize: '0.78rem',
                  color: '#92400e',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontWeight: 600, marginBottom: '0.2rem' }}>
                  <Shield size={13} />
                  <span>Important Governance Notice</span>
                </div>
                This report is registered in the AirLens community research log for urban pollution modeling. It is
                <strong> not an official municipal dispatch or emergency complaint</strong> to PMC, PCMC, or law
                enforcement. For hazardous emergencies or active fire risks, contact local fire/emergency services directly.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setSubmitSuccessResponse(null)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(40, 122, 69, 0.3)',
                    background: 'rgba(240, 253, 244, 0.8)',
                    color: '#166534',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Report Another Incident
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('my-reports');
                    setSubmitSuccessResponse(null);
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 101, 52, 0.25)',
                  }}
                >
                  View My Submitted Reports
                </button>
              </div>
            </div>
          ) : (
            /* Primary Report Form */
            <form onSubmit={handleSubmit} style={{ maxWidth: '820px' }}>
              {formErrors.submit && (
                <div
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(254, 226, 226, 0.85)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#b91c1c',
                    fontSize: '0.85rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Step 1: Category Selection */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '16px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 6px 24px rgba(22, 38, 25, 0.05)',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710', display: 'block', marginBottom: '0.2rem' }}>
                    1. Select Pollution Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#526b59' }}>
                    Choose the observed incident type. You are reporting an observed concern, not proving a legal violation.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '0.65rem',
                  }}
                >
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = category === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => setCategory(opt.key)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #166534' : '1.5px solid rgba(40, 122, 69, 0.2)',
                          background: isSelected ? 'rgba(240, 253, 244, 0.95)' : '#ffffff',
                          boxShadow: isSelected ? '0 4px 14px rgba(22, 101, 52, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {opt.icon}
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? '#0d1710' : '#1e293b' }}>
                            {opt.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: isSelected ? '#475e4e' : '#64748b', lineHeight: 1.4 }}>
                          {opt.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Location */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '16px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 6px 24px rgba(22, 38, 25, 0.05)',
                }}
              >
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710', display: 'block', marginBottom: '0.2rem' }}>
                    2. Incident Location <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#526b59' }}>
                    Specify where the pollution is occurring. Search a Pune or PCMC locality, or pinpoint on the map.
                  </p>
                </div>

                <IncidentLocationPicker
                  locationName={locationName}
                  latitude={latitude}
                  longitude={longitude}
                  onChangeLocation={(name, lat, lon) => {
                    setLocationName(name);
                    setLatitude(lat);
                    setLongitude(lon);
                    if (formErrors.location) {
                      setFormErrors((prev) => {
                        const { location, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />

                {formErrors.location && (
                  <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.location}</span>
                  </div>
                )}
              </div>

              {/* Step 3: Observation Time & Description */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '16px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 6px 24px rgba(22, 38, 25, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                }}
              >
                {/* Observation Time */}
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710', display: 'block', marginBottom: '0.2rem' }}>
                    3. Observation Date &amp; Time <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#526b59' }}>
                    When did you observe this incident? Defaults to current time; change if observed earlier today.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Clock size={16} color="#166534" />
                    <input
                      type="datetime-local"
                      value={observedAt}
                      onChange={(e) => {
                        setObservedAt(e.target.value);
                        if (formErrors.observedAt) {
                          setFormErrors((prev) => {
                            const { observedAt, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1.5px solid rgba(40, 122, 69, 0.25)',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {formErrors.observedAt && (
                    <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={13} />
                      <span>{formErrors.observedAt}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710' }}>
                      4. Observation Description <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: description.length > 900 ? '#f59e0b' : '#64748b' }}>
                      {description.length} / 1000 characters
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#526b59' }}>
                    Describe the situation clearly. Example: &ldquo;Thick white smoke from open leaf burning near the housing society boundary.&rdquo;
                  </p>
                  <textarea
                    rows={4}
                    value={description}
                    maxLength={1000}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (formErrors.description) {
                        setFormErrors((prev) => {
                          const { description, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    placeholder="Enter factual details regarding the smoke color, source, intensity, or affected area..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1.5px solid rgba(40, 122, 69, 0.25)',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                  {formErrors.description && (
                    <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={13} />
                      <span>{formErrors.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Optional Photo Attachment */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(40, 122, 69, 0.18)',
                  borderRadius: '16px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 6px 24px rgba(22, 38, 25, 0.05)',
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0d1710', display: 'block', marginBottom: '0.2rem' }}>
                    5. Supporting Photograph (Optional)
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#526b59' }}>
                    Attach a clear photo of the smoke or dust cloud. Maximum file size: 5 MB (JPEG, PNG, or WebP).
                  </p>
                </div>

                {!photoPreview ? (
                  <div
                    style={{
                      border: '2px dashed rgba(40, 122, 69, 0.35)',
                      borderRadius: '10px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: 'rgba(240, 253, 244, 0.6)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('photo-upload-input')?.click()}
                  >
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                    <Camera size={26} color="#166534" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                    <div style={{ fontSize: '0.86rem', color: '#0d1710', fontWeight: 600 }}>
                      Click to choose an incident image
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#526b59', marginTop: '0.2rem' }}>
                      JPG, PNG, or WebP up to 5 MB
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid rgba(40, 122, 69, 0.25)',
                    }}
                  >
                    <img
                      src={photoPreview}
                      alt="Incident preview"
                      style={{
                        width: '72px',
                        height: '72px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid rgba(40, 122, 69, 0.25)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0d1710', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photoFile?.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#dc2626',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <X size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}

                {formErrors.photo && (
                  <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.photo}</span>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Privacy notice: Please avoid capturing identifiable faces or license plates in private spaces.
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.8rem 2rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    color: '#ffffff',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'default' : 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" />
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Pollution Report</span>
                    </>
                  )}
                </button>
                <span style={{ fontSize: '0.78rem', color: '#526b59' }}>
                  Saved to AirLens community incident registry.
                </span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. TAB 2: MY SUBMITTED REPORTS */}
      {activeTab === 'my-reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0d1710', margin: '0 0 0.3rem' }}>
                Reports Submitted from this Device
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#526b59' }}>
                Your submitted reports are securely associated with this browser session.
              </p>
            </div>

            <button
              onClick={loadMyReports}
              disabled={isLoadingReports}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(40, 122, 69, 0.25)',
                background: 'rgba(240, 253, 244, 0.85)',
                color: '#166534',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={isLoadingReports ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingReports ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#166534', fontWeight: 600 }}>
              Loading your submitted reports...
            </div>
          ) : myReports.length === 0 ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(40, 122, 69, 0.18)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '1.5rem auto',
                boxShadow: '0 6px 24px rgba(22, 38, 25, 0.05)',
              }}
            >
              <FileText size={32} color="#166534" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0d1710', margin: '0 0 0.4rem' }}>
                No Submitted Reports Found
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#526b59', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                You have not submitted any pollution incidents from this browser yet. Use the Submit a Report tab to log
                visible smoke, open burning, or dust.
              </p>
              <button
                onClick={() => setActiveTab('submit')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#166534',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 101, 52, 0.25)',
                }}
              >
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(40, 122, 69, 0.18)',
                    borderRadius: '12px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    boxShadow: '0 2px 10px rgba(22, 38, 25, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: 'rgba(40, 122, 69, 0.1)',
                        border: '1px solid rgba(40, 122, 69, 0.25)',
                        color: '#166534',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      {report.status}
                    </span>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '0.94rem', color: '#0d1710' }}>
                          {report.report_reference}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#526b59' }}>
                          · {report.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {report.location_name} · Submitted: {formatLocalIST(report.submitted_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedReportDetail(report)}
                      style={{
                        background: 'rgba(240, 253, 244, 0.85)',
                        border: '1px solid rgba(40, 122, 69, 0.25)',
                        color: '#166534',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Detail Modal for My Reports */}
      {selectedReportDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedReportDetail(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(40, 122, 69, 0.25)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              color: '#0d1710',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(40, 122, 69, 0.1)',
                    color: '#166534',
                    fontWeight: 700,
                  }}
                >
                  {selectedReportDetail.status}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.4rem 0 0', color: '#166534' }}>
                  {selectedReportDetail.report_reference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(240, 253, 244, 0.65)',
                border: '1px solid rgba(40, 122, 69, 0.18)',
                fontSize: '0.78rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <span style={{ color: '#526b59' }}>Category:</span>
                <div style={{ fontWeight: 600, color: '#0d1710', marginTop: '0.15rem' }}>
                  {selectedReportDetail.category.replace(/_/g, ' ')}
                </div>
              </div>
              <div>
                <span style={{ color: '#526b59' }}>Incident Location:</span>
                <div style={{ fontWeight: 600, color: '#0d1710', marginTop: '0.15rem' }}>
                  {selectedReportDetail.location_name}
                </div>
              </div>
              <div>
                <span style={{ color: '#526b59' }}>Observed At:</span>
                <div style={{ fontWeight: 600, color: '#0d1710', marginTop: '0.15rem' }}>
                  {formatLocalIST(selectedReportDetail.observed_at)}
                </div>
              </div>
              <div>
                <span style={{ color: '#526b59' }}>Submitted At:</span>
                <div style={{ fontWeight: 600, color: '#0d1710', marginTop: '0.15rem' }}>
                  {formatLocalIST(selectedReportDetail.submitted_at)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#526b59' }}>Description:</span>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                {selectedReportDetail.description}
              </p>
            </div>

            {selectedReportDetail.attachment_path && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#526b59', display: 'block', marginBottom: '0.35rem' }}>
                  Attached Photograph:
                </span>
                <img
                  src={selectedReportDetail.attachment_path}
                  alt="Incident attachment"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    borderRadius: '8px',
                    border: '1px solid rgba(40, 122, 69, 0.25)',
                    objectFit: 'contain',
                    background: '#f8fafc',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedReportDetail(null)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  background: '#166534',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPollution;
