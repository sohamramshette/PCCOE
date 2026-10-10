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
              background: 'rgba(92, 114, 82, 0.25)',
              border: '1px solid rgba(138, 168, 126, 0.4)',
              color: '#8aa87e',
              textTransform: 'uppercase',
            }}
          >
            <Camera size={12} />
            Community Incident Log
          </span>
          <span style={{ fontSize: '0.78rem', color: '#9ba395' }}>· Pune &amp; Pimpri-Chinchwad</span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.35rem' }}>
          Report Pollution Incident
        </h1>
        <p style={{ margin: 0, fontSize: '0.92rem', color: '#b2baa8', maxWidth: '750px', lineHeight: 1.5 }}>
          Help map localized environmental concerns across Pune and PCMC. Submit visible pollution incidents such as
          waste burning, construction dust, or thick smoke to the digital twin log.
        </p>
      </div>

      {/* 2. Top Tabs: Submit vs. My Reports */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(92, 114, 82, 0.25)',
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
            border: 'none',
            background: activeTab === 'submit' ? 'rgba(92, 114, 82, 0.35)' : 'transparent',
            color: activeTab === 'submit' ? '#eef1e7' : '#9ba395',
            fontWeight: activeTab === 'submit' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
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
            border: 'none',
            background: activeTab === 'my-reports' ? 'rgba(92, 114, 82, 0.35)' : 'transparent',
            color: activeTab === 'my-reports' ? '#eef1e7' : '#9ba395',
            fontWeight: activeTab === 'my-reports' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
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
                background: 'rgba(92, 114, 82, 0.3)',
                color: '#9ba395',
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
                background: 'rgba(24, 30, 20, 0.8)',
                border: '1px solid rgba(138, 168, 126, 0.4)',
                borderRadius: '16px',
                padding: '2.25rem 2rem',
                maxWidth: '680px',
                margin: '1rem auto',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(138, 168, 126, 0.25)',
                  border: '1.5px solid #8aa87e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8aa87e',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle2 size={30} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#eef1e7', textAlign: 'center', margin: '0 0 0.4rem' }}>
                Report Submitted Successfully
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#b9c1b2', textAlign: 'center', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                Your pollution incident observation has been registered into the AirLens community log with reference:
              </p>

              {/* Reference Badge Box */}
              <div
                style={{
                  background: 'rgba(18, 22, 15, 0.9)',
                  border: '1.5px dashed rgba(138, 168, 126, 0.5)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#889381', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Incident Reference Number
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8aa87e', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                    {submitSuccessResponse.report_reference}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyReference(submitSuccessResponse.report_reference)}
                  style={{
                    background: copiedRef ? 'rgba(138, 168, 126, 0.25)' : 'rgba(30, 38, 26, 0.8)',
                    border: '1px solid rgba(138, 168, 126, 0.4)',
                    color: copiedRef ? '#8aa87e' : '#eef1e7',
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
                  background: 'rgba(30, 36, 26, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(92, 114, 82, 0.25)',
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <span style={{ color: '#889381' }}>Category:</span>
                  <div style={{ color: '#eef1e7', fontWeight: 600, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.category.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#889381' }}>Location:</span>
                  <div style={{ color: '#eef1e7', fontWeight: 600, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.location_name}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#889381' }}>Observed At:</span>
                  <div style={{ color: '#eef1e7', fontWeight: 600, marginTop: '0.15rem' }}>
                    {formatLocalIST(submitSuccessResponse.report.observed_at)}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#889381' }}>Current Status:</span>
                  <div style={{ color: '#8aa87e', fontWeight: 700, marginTop: '0.15rem' }}>
                    {submitSuccessResponse.report.status}
                  </div>
                </div>
              </div>

              {/* Legal & Governance Notice */}
              <div
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '8px',
                  background: 'rgba(20, 24, 16, 0.7)',
                  border: '1px solid rgba(92, 114, 82, 0.2)',
                  fontSize: '0.78rem',
                  color: '#889381',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9ba395', fontWeight: 600, marginBottom: '0.2rem' }}>
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
                    border: '1px solid rgba(138, 168, 126, 0.4)',
                    background: 'rgba(92, 114, 82, 0.25)',
                    color: '#8aa87e',
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
                    background: 'linear-gradient(135deg, #5c7252 0%, #3e5036 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
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
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
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
                  background: 'rgba(24, 30, 20, 0.75)',
                  border: '1px solid rgba(92, 114, 82, 0.25)',
                  borderRadius: '14px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
                    1. Select Pollution Category <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ba395' }}>
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
                          border: '1.5px solid',
                          borderColor: isSelected ? '#8aa87e' : 'rgba(92, 114, 82, 0.22)',
                          background: isSelected ? 'rgba(138, 168, 126, 0.2)' : 'rgba(20, 24, 16, 0.6)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {opt.icon}
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#d6ded0' }}>
                            {opt.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: isSelected ? '#b9cbb3' : '#7f8a78', lineHeight: 1.4 }}>
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
                  background: 'rgba(24, 30, 20, 0.75)',
                  border: '1px solid rgba(92, 114, 82, 0.25)',
                  borderRadius: '14px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
                    2. Incident Location <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ba395' }}>
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
                  <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.location}</span>
                  </div>
                )}
              </div>

              {/* Step 3: Observation Time & Description */}
              <div
                style={{
                  background: 'rgba(24, 30, 20, 0.75)',
                  border: '1px solid rgba(92, 114, 82, 0.25)',
                  borderRadius: '14px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                }}
              >
                {/* Observation Time */}
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
                    3. Observation Date &amp; Time <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#9ba395' }}>
                    When did you observe this incident? Defaults to current time; change if observed earlier today.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Clock size={16} color="#8aa87e" />
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
                        background: 'rgba(20, 26, 18, 0.8)',
                        border: '1px solid rgba(92, 114, 82, 0.35)',
                        color: '#eef1e7',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {formErrors.observedAt && (
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={13} />
                      <span>{formErrors.observedAt}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#eef1e7' }}>
                      4. Observation Description <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: description.length > 900 ? '#f59e0b' : '#889381' }}>
                      {description.length} / 1000 characters
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#9ba395' }}>
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
                      background: 'rgba(20, 26, 18, 0.8)',
                      border: '1.5px solid rgba(92, 114, 82, 0.35)',
                      color: '#eef1e7',
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                  {formErrors.description && (
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={13} />
                      <span>{formErrors.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Optional Photo Attachment */}
              <div
                style={{
                  background: 'rgba(24, 30, 20, 0.75)',
                  border: '1px solid rgba(92, 114, 82, 0.25)',
                  borderRadius: '14px',
                  padding: '1.35rem 1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: '#eef1e7', display: 'block', marginBottom: '0.2rem' }}>
                    5. Supporting Photograph (Optional)
                  </label>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ba395' }}>
                    Attach a clear photo of the smoke or dust cloud. Maximum file size: 5 MB (JPEG, PNG, or WebP).
                  </p>
                </div>

                {!photoPreview ? (
                  <div
                    style={{
                      border: '1.5px dashed rgba(92, 114, 82, 0.4)',
                      borderRadius: '10px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: 'rgba(20, 24, 16, 0.5)',
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
                    <Camera size={26} color="#8aa87e" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                    <div style={{ fontSize: '0.86rem', color: '#eef1e7', fontWeight: 600 }}>
                      Click to choose an incident image
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#889381', marginTop: '0.2rem' }}>
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
                      background: 'rgba(20, 26, 18, 0.8)',
                      border: '1px solid rgba(92, 114, 82, 0.35)',
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
                        border: '1px solid rgba(138, 168, 126, 0.4)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#eef1e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photoFile?.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#889381', marginTop: '0.15rem' }}>
                        {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
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
                  <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.photo}</span>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#7a8573', marginTop: '0.5rem' }}>
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
                    background: 'linear-gradient(135deg, #5c7252 0%, #3e5036 100%)',
                    color: '#ffffff',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'default' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
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
                <span style={{ fontSize: '0.78rem', color: '#889381' }}>
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.3rem' }}>
                Reports Submitted from this Device
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#9ba395' }}>
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
                border: '1px solid rgba(238, 241, 231, 0.15)',
                background: 'rgba(30, 36, 26, 0.7)',
                color: '#d6ded0',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={isLoadingReports ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingReports ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#8aa87e' }}>
              Loading your submitted reports...
            </div>
          ) : myReports.length === 0 ? (
            <div
              style={{
                background: 'rgba(24, 30, 20, 0.6)',
                border: '1px solid rgba(92, 114, 82, 0.25)',
                borderRadius: '14px',
                padding: '3rem 2rem',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '1.5rem auto',
              }}
            >
              <FileText size={32} color="#8aa87e" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#eef1e7', margin: '0 0 0.4rem' }}>
                No Submitted Reports Found
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#9ba395', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                You have not submitted any pollution incidents from this browser yet. Use the Submit a Report tab to log
                visible smoke, open burning, or dust.
              </p>
              <button
                onClick={() => setActiveTab('submit')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(92, 114, 82, 0.35)',
                  color: '#8aa87e',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
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
                    background: 'rgba(24, 30, 20, 0.75)',
                    border: '1px solid rgba(92, 114, 82, 0.25)',
                    borderRadius: '12px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: 'rgba(92, 114, 82, 0.25)',
                        border: '1px solid rgba(138, 168, 126, 0.4)',
                        color: '#8aa87e',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      {report.status}
                    </span>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <strong style={{ fontSize: '0.94rem', color: '#eef1e7' }}>
                          {report.report_reference}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#adb7a4' }}>
                          · {report.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#889381', marginTop: '0.2rem' }}>
                        {report.location_name} · Submitted: {formatLocalIST(report.submitted_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedReportDetail(report)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(238, 241, 231, 0.15)',
                        color: '#9ba395',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
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
            background: 'rgba(0, 0, 0, 0.75)',
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
              background: '#191f16',
              border: '1px solid rgba(92, 114, 82, 0.4)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              color: '#eef1e7',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
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
                    background: 'rgba(92, 114, 82, 0.25)',
                    color: '#8aa87e',
                    fontWeight: 700,
                  }}
                >
                  {selectedReportDetail.status}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.4rem 0 0', color: '#8aa87e' }}>
                  {selectedReportDetail.report_reference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ba395',
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
                background: 'rgba(28, 34, 24, 0.7)',
                fontSize: '0.78rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <span style={{ color: '#889381' }}>Category:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {selectedReportDetail.category.replace(/_/g, ' ')}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Incident Location:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {selectedReportDetail.location_name}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Observed At:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {formatLocalIST(selectedReportDetail.observed_at)}
                </div>
              </div>
              <div>
                <span style={{ color: '#889381' }}>Submitted At:</span>
                <div style={{ fontWeight: 600, color: '#eef1e7', marginTop: '0.15rem' }}>
                  {formatLocalIST(selectedReportDetail.submitted_at)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#889381' }}>Description:</span>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem', color: '#c5cebe', lineHeight: 1.5 }}>
                {selectedReportDetail.description}
              </p>
            </div>

            {selectedReportDetail.attachment_path && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#889381', display: 'block', marginBottom: '0.35rem' }}>
                  Attached Photograph:
                </span>
                <img
                  src={selectedReportDetail.attachment_path}
                  alt="Incident attachment"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    borderRadius: '8px',
                    border: '1px solid rgba(138, 168, 126, 0.3)',
                    objectFit: 'contain',
                    background: '#0d110c',
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
                  background: 'rgba(92, 114, 82, 0.3)',
                  border: '1px solid rgba(138, 168, 126, 0.4)',
                  color: '#8aa87e',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
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
