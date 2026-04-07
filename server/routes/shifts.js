/* ════════════════════════════════════════════════════════════════════
   POF GMS — Shift Routes (Protected)
   GET  /api/shifts     → Get all shift configurations
   PUT  /api/shifts/:category → Update shifts for a category
   ════════════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { Shift } = require('../models');

// ── GET /api/shifts ──
router.get('/', async (req, res) => {
  try {
    const shifts = await Shift.findAll();

    // Transform to the format the frontend expects:
    // { "POF Employee": { morning: ["06:00","10:00"], evening: [...], night: [...] }, ... }
    const data = {};
    shifts.forEach(s => {
      data[s.category] = {
        morning: [s.morning_start, s.morning_end],
        evening: [s.evening_start, s.evening_end],
        night: [s.night_start, s.night_end],
      };
    });

    // If any category is missing, add defaults
    const categories = ['POF Employee', 'Son of POF Employee', 'Civilian'];
    categories.forEach(cat => {
      if (!data[cat]) {
        data[cat] = {
          morning: ['06:00', '10:00'],
          evening: ['16:00', '20:00'],
          night: ['20:00', '22:00'],
        };
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shifts.' });
  }
});

// ── PUT /api/shifts/:category ──
router.put('/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const { morning, evening, night } = req.body;

    // morning, evening, night are arrays like ["06:00","10:00"]
    if (!morning || !evening || !night) {
      return res.status(400).json({
        success: false,
        message: 'Morning, evening, and night timings are required.',
      });
    }

    // Find or create shift record
    let [shift, created] = await Shift.findOrCreate({
      where: { category },
      defaults: {
        morning_start: morning[0],
        morning_end: morning[1],
        evening_start: evening[0],
        evening_end: evening[1],
        night_start: night[0],
        night_end: night[1],
      },
    });

    if (!created) {
      shift.morning_start = morning[0];
      shift.morning_end = morning[1];
      shift.evening_start = evening[0];
      shift.evening_end = evening[1];
      shift.night_start = night[0];
      shift.night_end = night[1];
      await shift.save();
    }

    res.json({
      success: true,
      message: `${category} timings saved.`,
    });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ success: false, message: 'Failed to update shift.' });
  }
});

module.exports = router;
