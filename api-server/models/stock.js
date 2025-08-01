'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Stock extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Stock belongs to User
      Stock.belongsTo(models.user, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      // Stock has many MarketData
      Stock.hasMany(models.MarketData, {
        foreignKey: 'symbol',
        sourceKey: 'symbol',
        as: 'marketData'
      });
    }
  }
  Stock.init({
    symbol: DataTypes.STRING,
    name: DataTypes.STRING,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'stock',
    tableName: 'Stocks',
  });
  return Stock;
}; 