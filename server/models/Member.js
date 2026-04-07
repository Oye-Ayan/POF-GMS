/* ════════════════════════════════════════════════════════════════════
   POF GMS — Member Model
   Stores gym member data: personal info, category, shift, fee status.
   feeHistory is stored as a JSON column for flexible monthly tracking.
   ════════════════════════════════════════════════════════════════════ */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Member = sequelize.define('members', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  sr_no: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '',
  },
  cnic: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '',
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '',
  },
  category: {
    type: DataTypes.ENUM('POF Employee', 'Son of POF Employee', 'Civilian'),
    allowNull: false,
    defaultValue: 'Civilian',
  },
  shift: {
    type: DataTypes.ENUM('Morning', 'Evening', 'Night'),
    allowNull: false,
    defaultValue: 'Morning',
  },
  fee: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Paid', 'Pending'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  joindate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fee_history: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object: { "2026": { "0": "Paid", "1": "Pending", ... } }',
  },
}, {
  tableName: 'members',
  timestamps: true,
  underscored: true,
});

module.exports = Member;
