/* ════════════════════════════════════════════════════════════════════
   POF GMS — Shift Model
   Stores shift timing configuration per member category.
   ════════════════════════════════════════════════════════════════════ */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Shift = sequelize.define('shifts', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  category: {
    type: DataTypes.ENUM('POF Employee', 'Son of POF Employee', 'Civilian'),
    allowNull: false,
    unique: true,
  },
  morning_start: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '06:00',
  },
  morning_end: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '10:00',
  },
  evening_start: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '16:00',
  },
  evening_end: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '20:00',
  },
  night_start: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '20:00',
  },
  night_end: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '22:00',
  },
}, {
  tableName: 'shifts',
  timestamps: true,
  underscored: true,
});

module.exports = Shift;
