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
    symbol: DataTypes.STRING,
    date: DataTypes.DATEONLY,
    price: DataTypes.INTEGER,
    change: DataTypes.INTEGER,
    changeRate: DataTypes.FLOAT, // 데이터 타입 FLOAT으로 변경
    stockName: DataTypes.STRING, // main.py에서 추가된 필드
    foreignerNetBuy1: DataTypes.INTEGER,
    foreignerNetBuy2: DataTypes.INTEGER,
    foreignerNetBuy3: DataTypes.INTEGER,
    foreignerNetBuy4: DataTypes.INTEGER,
    foreignerNetBuy5: DataTypes.INTEGER,
    foreignerNetBuy6: DataTypes.INTEGER,
    foreignerNetBuy7: DataTypes.INTEGER,
    foreignerNetBuy8: DataTypes.INTEGER,
    foreignerNetBuyDate1: DataTypes.DATEONLY, // 날짜 컬럼 추가
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