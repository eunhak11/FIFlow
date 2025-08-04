'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Stars 테이블 삭제
    await queryInterface.dropTable('Stars');
  },

  async down(queryInterface, Sequelize) {
    // 롤백 시 Stars 테이블 재생성
    await queryInterface.createTable('Stars', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      symbol: {
        type: Sequelize.STRING(20),
        allowNull: false
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

    // 복합 인덱스 추가
    await queryInterface.addIndex('Stars', ['userId', 'symbol'], {
      unique: true
    });
  }
}; 