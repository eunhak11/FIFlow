'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MarketData', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      symbol: {
        type: Sequelize.STRING
      },
      date: {
        type: Sequelize.DATEONLY
      },
      price: {
        type: Sequelize.INTEGER
      },
      change: {
        type: Sequelize.INTEGER
      },
      changeRate: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      stockName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      foreignerNetBuy1: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate1: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy2: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate2: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy3: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate3: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy4: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate4: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy5: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate5: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy6: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate6: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy7: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate7: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      foreignerNetBuy8: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuyDate8: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MarketData');
  }
};
