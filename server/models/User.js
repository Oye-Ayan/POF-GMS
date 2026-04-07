/* ════════════════════════════════════════════════════════════════════
   POF GMS — User Model
   *** PREVIOUS VERSION (without role) is commented out below ***
   Stores user credentials with bcrypt hashing and role-based access.
   ════════════════════════════════════════════════════════════════════ */

/*
// ── PREVIOUS VERSION (no role field) ──
// const User = sequelize.define('users', {
//   id, username, email, password_hash, reset_token, reset_token_expiry
//   // No role field — all users were equal
// });
*/

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
    },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('manager', 'staff'),
    allowNull: false,
    defaultValue: 'staff',
    comment: 'manager = full access, staff = limited access',
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(12);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
  },
});

// Instance method: compare password
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = User;
