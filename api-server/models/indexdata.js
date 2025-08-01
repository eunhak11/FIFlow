'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class IndexData extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define associations here
    }
  }
  IndexData.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '지수명 (KOSPI, KOSDAQ, KPI200 등)'
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '지수 값'
    },
    change: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '변화량'
    },
    changeRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: '변화율 (%)'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '데이터 날짜'
    }
  }, {
    sequelize,
    modelName: 'IndexData',
    tableName: 'IndexData',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'date']
      }
    ]
  });
  return IndexData;
}; 