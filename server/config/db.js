const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectModule: require('mysql2'), // Forces Vercel builder to package raw binaries properly
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 3, // Throttled maximum simultaneous connections for serverless
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,      // adds createdAt, updatedAt
      underscored: true,     // snake_case column names
      freezeTableName: true, // don't pluralize table names
    },
  }
);

module.exports = sequelize;
