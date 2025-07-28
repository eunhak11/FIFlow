'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('MarketData', 'changeRate', {
      type: Sequelize.FLOAT,
      allowNull: true, // 필요에 따라 false로 변경 가능
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('MarketData', 'changeRate');
  }
};