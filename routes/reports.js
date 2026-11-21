import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { fileStore, sanitizeDisplayName } from '../services/fileStore.js';

const router = express.Router();

// Rate limiter for report uploads (20 uploads per 15 minutes per IP)
const reportUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many report upload attempts. Please try again later.' }
});

// Configure multer with memory storage and early cutoff limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file limit
    files: 5 // Max 5 files per upload batch
  }
}).array('files', 5);

// Multer error handling wrapper to return HTTP 413 on payload limit breach
const handleMulterUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File too large. Maximum allowed size is 5 MB per file.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            success: false,
            message: 'Too many files. Maximum 5 files per appointment allowed.'
          });
        }
        return res.status(413).json({
          success: false,
          message: `Upload limit exceeded: ${err.message}`
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Access log entry recorder.
 * Never logs raw file contents or sensitive file bytes.
 */
export function logReportAccess({ report_id = null, appointment_id = null, user_id, role, action, details = '' }) {
  if (!Array.isArray(db.store.data.report_logs)) {
    db.store.data.report_logs = [];
  }
  const logId = (db.store.data.report_logs.length > 0
    ? Math.max(...db.store.data.report_logs.map(l => l.id || 0))
    : 0) + 1;

  const entry = {
    id: logId,
    report_id,
    appointment_id,
    user_id: user_id || null,
    role: role || 'anonymous',
    action, // 'upload' | 'view' | 'download' | 'delete'
    details: details.substring(0, 200),
    timestamp: new Date().toISOString()
  };
  db.store.data.report_logs.push(entry);
  db.save();
  return entry;
}

/**
 * POST /api/appointments/:id/reports
 * Uploads medical reports for an appointment.
 * Allowed: Patient who owns appointment, receptionist, or admin.
 */
router.post(
  '/appointments/:id/reports',
  authenticateToken,
  reportUploadLimiter,
  handleMulterUpload,
  async (req, res) => {
    try {
      const appointmentId = Number(req.params.id);
      const appt = db.store.data.appointments.find(a => a.id === appointmentId);

      // Return 404 if appointment does not exist
      if (!appt) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      // Check appointment status constraints
      if (appt.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot attach medical reports to a cancelled appointment.'
        });
      }
      if (appt.status === 'pending_payment') {
        return res.status(400).json({
          success: false,
          message: 'Cannot attach reports while appointment is pending payment.'
        });
      }

      // Role authorization check (return 404 to avoid ID probing)
      if (req.user.role === 'patient') {
        if (appt.patient_id !== req.user.id) {
          return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
      } else if (req.user.role !== 'receptionist' && req.user.role !== 'admin') {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files were uploaded.' });
      }

      // Check max 5 reports per appointment limit
      const existingReports = (db.store.data.reports || []).filter(
        r => r.appointment_id === appointmentId && !r.deleted_at
      );
      if (existingReports.length + req.files.length > 5) {
        return res.status(413).json({
          success: false,
          message: `Appointment report limit exceeded. Maximum 5 reports allowed per appointment (already has ${existingReports.length}).`
        });
      }

      // Check 20 MB total per patient quota
      const patientId = appt.patient_id;
      if (patientId) {
        const patientExistingReports = (db.store.data.reports || []).filter(
          r => r.patient_id === patientId && !r.deleted_at
        );
        const currentPatientSize = patientExistingReports.reduce((sum, r) => sum + (r.size || 0), 0);
        const incomingSize = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const MAX_PATIENT_BYTES = 20 * 1024 * 1024; // 20 MB

        if (currentPatientSize + incomingSize > MAX_PATIENT_BYTES) {
          return res.status(413).json({
            success: false,
            message: `Patient storage limit exceeded. Total allowed storage is 20 MB per patient. Current used: ${(currentPatientSize / (1024 * 1024)).toFixed(1)} MB.`
          });
        }
      }

      // Validate files by real magic bytes content via file-type (HTTP 415 on failure)
      const validatedFiles = [];
      for (const file of req.files) {
        const typeInfo = await fileTypeFromBuffer(file.buffer);
        if (!typeInfo || !ALLOWED_MIME_TYPES.includes(typeInfo.mime)) {
          return res.status(415).json({
            success: false,
            message: `Unsupported media type for "${file.originalname}". Real file content must be PDF, JPG, or PNG.`
          });
        }
        validatedFiles.push({ file, typeInfo });
      }

      // Sanitize optional note (max 200 chars)
      const rawNote = typeof req.body.note === 'string' ? req.body.note.trim() : '';
      const sanitizedNote = rawNote.substring(0, 200);

      // Save files via storage abstraction and record in store
      const createdReports = [];
      if (!Array.isArray(db.store.data.reports)) {
        db.store.data.reports = [];
      }

      for (const { file, typeInfo } of validatedFiles) {
        const storedName = await fileStore.saveFile(file.buffer);
        const displayName = sanitizeDisplayName(file.originalname);
        const nextId = (db.store.data.reports.length > 0
          ? Math.max(...db.store.data.reports.map(r => r.id || 0))
          : 0) + 1;

        const reportRecord = {
          id: nextId,
          appointment_id: appt.id,
          patient_id: appt.patient_id || null,
          doctor_id: appt.doctor_id,
          stored_name: storedName,
          display_name: displayName,
          mime: typeInfo.mime,
          size: file.size,
          uploaded_at: new Date().toISOString(),
          uploaded_by_role: req.user.role,
          note: sanitizedNote,
          deleted_at: null
        };

        db.store.data.reports.push(reportRecord);
        createdReports.push(reportRecord);

        // Audit log entry
        logReportAccess({
          report_id: reportRecord.id,
          appointment_id: appt.id,
          user_id: req.user.id,
          role: req.user.role,
          action: 'upload',
          details: `Uploaded ${displayName} (${file.size} bytes)`
        });
      }

      db.save();

      res.status(201).json({
        success: true,
        message: `${createdReports.length} report(s) uploaded successfully`,
        reports: createdReports.map(r => ({
          id: r.id,
          appointment_id: r.appointment_id,
          display_name: r.display_name,
          mime: r.mime,
          size: r.size,
          uploaded_at: r.uploaded_at,
          uploaded_by_role: r.uploaded_by_role,
          note: r.note
        }))
      });
    } catch (err) {
      console.error('[Reports] Upload error:', err);
      res.status(500).json({ success: false, message: 'Server error processing file upload' });
    }
  }
);

/**
 * GET /api/appointments/:id/reports
 * Returns metadata list of medical reports for an appointment.
 * Allowed: Owner patient, treating doctor (doctor_id in JWT), receptionist, admin.
 * Return 404 (not 403) when user has no access.
 */
router.get('/appointments/:id/reports', authenticateToken, (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const appt = db.store.data.appointments.find(a => a.id === appointmentId);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Access authorization
    const role = req.user.role;
    let allowed = false;

    if (role === 'patient') {
      allowed = appt.patient_id === req.user.id;
    } else if (role === 'doctor') {
      // Treating doctor check
      allowed = Number(req.user.doctor_id) === appt.doctor_id;
    } else if (role === 'receptionist' || role === 'admin') {
      allowed = true;
    }

    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const reports = (db.store.data.reports || [])
      .filter(r => r.appointment_id === appointmentId && !r.deleted_at)
      .map(r => ({
        id: r.id,
        appointment_id: r.appointment_id,
        patient_id: r.patient_id,
        doctor_id: r.doctor_id,
        display_name: r.display_name,
        mime: r.mime,
        size: r.size,
        uploaded_at: r.uploaded_at,
        uploaded_by_role: r.uploaded_by_role,
        note: r.note
      }));

    // Audit log entry for viewing
    logReportAccess({
      appointment_id: appt.id,
      user_id: req.user.id,
      role: req.user.role,
      action: 'view',
      details: `Viewed reports metadata list for appointment #${appt.id}`
    });

    res.json({ success: true, reports });
  } catch (err) {
    console.error('[Reports] List error:', err);
    res.status(500).json({ success: false, message: 'Server error listing reports' });
  }
});

/**
 * GET /api/reports/:reportId/download
 * Secure streaming endpoint for a medical report.
 * Allowed: Owner patient, treating doctor, receptionist, admin.
 * Returns 404 (not 403) on unauthenticated/unauthorized access to prevent ID probing.
 */
router.get('/reports/:reportId/download', authenticateToken, (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    const report = (db.store.data.reports || []).find(r => r.id === reportId && !r.deleted_at);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const appt = db.store.data.appointments.find(a => a.id === report.appointment_id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Access authorization check
    const role = req.user.role;
    let allowed = false;

    if (role === 'patient') {
      allowed = appt.patient_id === req.user.id;
    } else if (role === 'doctor') {
      allowed = Number(req.user.doctor_id) === appt.doctor_id;
    } else if (role === 'receptionist' || role === 'admin') {
      allowed = true;
    }

    if (!allowed) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (!fileStore.fileExists(report.stored_name)) {
      return res.status(404).json({ success: false, message: 'Report file not found on storage' });
    }

    // Set mandatory security headers
    res.setHeader('Content-Type', report.mime || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    // Inline preview only for PDF and images when requested via ?inline=true
    const isInlineRequested = req.query.inline === 'true' || req.query.preview === '1';
    const isViewableMime = ['application/pdf', 'image/jpeg', 'image/png'].includes(report.mime);
    const dispositionType = (isInlineRequested && isViewableMime) ? 'inline' : 'attachment';

    const safeFilename = report.display_name.replace(/["\r\n]/g, '_');
    const encodedFilename = encodeURIComponent(report.display_name);
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    // Audit log entry for download
    logReportAccess({
      report_id: report.id,
      appointment_id: appt.id,
      user_id: req.user.id,
      role: req.user.role,
      action: 'download',
      details: `Downloaded report #${report.id} (${dispositionType})`
    });

    const stream = fileStore.getReadStream(report.stored_name);
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Report file stream error' });
    }
    stream.pipe(res);
  } catch (err) {
    console.error('[Reports] Download error:', err);
    res.status(500).json({ success: false, message: 'Server error downloading report' });
  }
});

/**
 * DELETE /api/reports/:reportId
 * Soft deletes report. Allowed: Owner patient (within 24 hours of upload) or admin.
 */
router.delete('/reports/:reportId', authenticateToken, (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    const report = (db.store.data.reports || []).find(r => r.id === reportId && !r.deleted_at);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const appt = db.store.data.appointments.find(a => a.id === report.appointment_id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const role = req.user.role;

    if (role === 'patient') {
      if (appt.patient_id !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      // Check 24-hour limit for patient deletion
      const uploadTime = new Date(report.uploaded_at).getTime();
      const ageHours = (Date.now() - uploadTime) / (1000 * 60 * 60);
      if (ageHours > 24) {
        return res.status(403).json({
          success: false,
          message: 'Patients can only delete reports within 24 hours of upload. Please contact hospital reception for older reports.'
        });
      }
    } else if (role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Soft delete
    report.deleted_at = new Date().toISOString();
    db.save();

    // Audit log entry for deletion
    logReportAccess({
      report_id: report.id,
      appointment_id: appt.id,
      user_id: req.user.id,
      role: req.user.role,
      action: 'delete',
      details: `Soft-deleted report #${report.id} (${report.display_name})`
    });

    res.json({ success: true, message: 'Medical report deleted successfully' });
  } catch (err) {
    console.error('[Reports] Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting report' });
  }
});

/**
 * GET /api/admin/reports/audit
 * Admin only: returns report access audit logs.
 */
router.get('/admin/reports/audit', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const logs = db.store.data.report_logs || [];
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
