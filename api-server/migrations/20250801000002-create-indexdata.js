'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IndexData', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '지수명 (KOSPI, KOSDAQ, KPI200 등)'
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: '지수 값'
      },
      change: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: '변화량'
      },
      changeRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: '변화율 (%)'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: '데이터 날짜'
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

    // name과 date에 대한 유니크 인덱스 추가
    await queryInterface.addIndex('IndexData', ['name', 'date'], {
      unique: true,
      name: 'indexdata_name_date_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('IndexData');
  }
}; 