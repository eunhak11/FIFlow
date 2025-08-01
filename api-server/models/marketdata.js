'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MarketData extends Model {
    static associate(models) {
      // define association here
    }
  }
  MarketData.init({
    symbol: DataTypes.STRING, // 종목 코드
    date: DataTypes.DATEONLY, // 날짜
    price: DataTypes.INTEGER, // 종가
    change: DataTypes.INTEGER, // 전일대비
    changeRate: DataTypes.FLOAT, // 등락률
    stockName: DataTypes.STRING, // 종목명
    foreignerNetBuy1: DataTypes.INTEGER, 
    foreignerNetBuy2: DataTypes.INTEGER, 
    foreignerNetBuy3: DataTypes.INTEGER, 
    foreignerNetBuy4: DataTypes.INTEGER,
    foreignerNetBuy5: DataTypes.INTEGER,
    foreignerNetBuy6: DataTypes.INTEGER,
    foreignerNetBuy7: DataTypes.INTEGER,
    foreignerNetBuy8: DataTypes.INTEGER,
    foreignerNetBuyDate1: DataTypes.DATEONLY,
    foreignerNetBuyDate2: DataTypes.DATEONLY,
    foreignerNetBuyDate3: DataTypes.DATEONLY,
    foreignerNetBuyDate4: DataTypes.DATEONLY,
    foreignerNetBuyDate5: DataTypes.DATEONLY,
    foreignerNetBuyDate6: DataTypes.DATEONLY,
    foreignerNetBuyDate7: DataTypes.DATEONLY,
    foreignerNetBuyDate8: DataTypes.DATEONLY
  }, {
    sequelize,
    modelName: 'MarketData',
  });
  return MarketData;
};