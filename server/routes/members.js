/* ════════════════════════════════════════════════════════════════════
   POF GMS — Member CRUD Routes (Protected)
   GET    /api/members          → List all members
   GET    /api/members/:id      → Get single member
   POST   /api/members          → Create member
   PUT    /api/members/:id      → Update member
   PATCH  /api/members/:id/fee  → Toggle fee status for a month
   DELETE /api/members/:id      → Delete member
   ════════════════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { Member } = require('../models');

// ── GET /api/members ──
router.get('/', async (req, res) => {
  try {
    const members = await Member.findAll({
      order: [['sr_no', 'ASC']],
    });

    // Transform to match frontend expected format
    const data = members.map(m => ({
      id: m.id,
      srNo: m.sr_no,
      name: m.name,
      phone: m.phone || '',
      cnic: m.cnic || '',
      address: m.address || '',
      category: m.category,
      shift: m.shift,
      fee: m.fee,
      status: m.status,
      joindate: m.joindate || '',
      feeHistory: m.fee_history || {},
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members.' });
  }
});

// ── GET /api/members/:id ──
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    res.json({
      success: true,
      data: {
        id: member.id,
        srNo: member.sr_no,
        name: member.name,
        phone: member.phone || '',
        cnic: member.cnic || '',
        address: member.address || '',
        category: member.category,
        shift: member.shift,
        fee: member.fee,
        status: member.status,
        joindate: member.joindate || '',
        feeHistory: member.fee_history || {},
      },
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch member.' });
  }
});

// ── POST /api/members ──
router.post('/', async (req, res) => {
  try {
    const { name, phone, cnic, address, category, shift, fee, status, joindate, feeHistory } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Member name is required.' });
    }

    // Calculate next sr_no
    const maxSr = await Member.max('sr_no') || 0;

    const member = await Member.create({
      sr_no: maxSr + 1,
      name: name.trim(),
      phone: phone || '',
      cnic: cnic || '',
      address: address || '',
      category: category || 'Civilian',
      shift: shift || 'Morning',
      fee: parseInt(fee) || 0,
      status: status || 'Pending',
      joindate: joindate || null,
      fee_history: feeHistory || {},
    });

    res.status(201).json({
      success: true,
      message: `${member.name} has been added to the system.`,
      data: {
        id: member.id,
        srNo: member.sr_no,
        name: member.name,
        phone: member.phone,
        cnic: member.cnic,
        address: member.address,
        category: member.category,
        shift: member.shift,
        fee: member.fee,
        status: member.status,
        joindate: member.joindate,
        feeHistory: member.fee_history,
      },
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ success: false, message: 'Failed to create member.' });
  }
});

// ── PUT /api/members/:id ──
router.put('/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const { name, phone, cnic, address, category, shift, fee, status, joindate, feeHistory } = req.body;

    if (name !== undefined) member.name = name.trim();
    if (phone !== undefined) member.phone = phone;
    if (cnic !== undefined) member.cnic = cnic;
    if (address !== undefined) member.address = address;
    if (category !== undefined) member.category = category;
    if (shift !== undefined) member.shift = shift;
    if (fee !== undefined) member.fee = parseInt(fee) || 0;
    if (status !== undefined) member.status = status;
    if (joindate !== undefined) member.joindate = joindate;
    if (feeHistory !== undefined) member.fee_history = feeHistory;

    await member.save();

    res.json({
      success: true,
      message: `${member.name} has been updated successfully.`,
      data: {
        id: member.id,
        srNo: member.sr_no,
        name: member.name,
        phone: member.phone,
        cnic: member.cnic,
        address: member.address,
        category: member.category,
        shift: member.shift,
        fee: member.fee,
        status: member.status,
        joindate: member.joindate,
        feeHistory: member.fee_history,
      },
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ success: false, message: 'Failed to update member.' });
  }
});

// ── PATCH /api/members/:id/fee ──
// Toggle fee status for a specific year/month
router.patch('/:id/fee', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const { year, month, status } = req.body;

    if (year === undefined || month === undefined || !status) {
      return res.status(400).json({ success: false, message: 'Year, month, and status are required.' });
    }

    // Update fee history
    let fh = member.fee_history || [];

    // Remove existing entry for same year/month
    fh = fh.filter(f => !(f.year == year && f.month == month));

    // Add new entry
    fh.push({
      year: parseInt(year),
      month: parseInt(month),
      status
    });

    member.fee_history = fh;

    // If current month, also update the main status field
    const now = new Date();
    if (parseInt(year) === now.getFullYear() && parseInt(month) === now.getMonth()) {
      member.status = status;
    }

    // Must explicitly mark as changed since it's a JSON field
    member.changed('fee_history', true);
    await member.save();

    res.json({
      success: true,
      message: `Fee marked as ${status}.`,
      data: {
        id: member.id,
        srNo: member.sr_no,
        name: member.name,
        status: member.status,
        feeHistory: member.fee_history,
      },
    });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fee.' });
  }
});

// ── DELETE /api/members/:id ──
router.delete('/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const name = member.name;
    await member.destroy();

    // Re-number remaining members
    const allMembers = await Member.findAll({ order: [['sr_no', 'ASC']] });
    for (let i = 0; i < allMembers.length; i++) {
      if (allMembers[i].sr_no !== i + 1) {
        allMembers[i].sr_no = i + 1;
        await allMembers[i].save();
      }
    }

    res.json({
      success: true,
      message: `${name} has been removed.`,
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member.' });
  }
});

module.exports = router;
