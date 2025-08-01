'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // stockName 컬럼 추가
    await queryInterface.addColumn('MarketData', 'stockName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // changeRate 컬럼 추가
    await queryInterface.addColumn('MarketData', 'changeRate', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    // 외국인 순매수 날짜 컬럼들 추가
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate1', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate2', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate3', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate4', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate5', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate6', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate7', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('MarketData', 'foreignerNetBuyDate8', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // 컬럼들 제거
    await queryInterface.removeColumn('MarketData', 'stockName');
    await queryInterface.removeColumn('MarketData', 'changeRate');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate1');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate2');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate3');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate4');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate5');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate6');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate7');
    await queryInterface.removeColumn('MarketData', 'foreignerNetBuyDate8');
  }
}; 