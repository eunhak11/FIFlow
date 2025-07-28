"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("MarketData", {
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
      foreignerNetBuy1: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy2: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy3: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy4: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy5: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy6: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy7: {
        type: Sequelize.INTEGER
      },
      foreignerNetBuy8: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("MarketData");
  }
}; 