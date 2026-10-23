import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// GET /api/departments
router.get('/', (req, res) => {
  const departments = db.store.data.departments || [];
  // Return with doctor count
  const result = departments.map(dept => {
    const doctorCount = db.store.data.doctors.filter(d => d.department_id === dept.id).length;
    return {
      ...dept,
      doctor_count: doctorCount
    };
  });

  res.json({ success: true, departments: result });
});

// GET /api/departments/:id
router.get('/:id', (req, res) => {
  const dept = db.store.data.departments.find(d => d.id === Number(req.params.id));
  if (!dept) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  const doctors = db.store.data.doctors.filter(d => d.department_id === dept.id);
  res.json({ success: true, department: dept, doctors });
});

export default router;
