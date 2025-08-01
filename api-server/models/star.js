const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Star = sequelize.define('Star', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Stars',
    timestamps: true
  });

  return Star;
}; 