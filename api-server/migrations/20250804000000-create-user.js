'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      kakaoId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        comment: '카카오 사용자 ID'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      nickname: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '사용자',
        comment: '사용자 닉네임'
      },
      loginType: {
        type: Sequelize.ENUM('kakao', 'email'),
        allowNull: false,
        defaultValue: 'kakao',
        comment: '로그인 방식'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '계정 활성화 상태'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '마지막 로그인 시간'
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
    await queryInterface.dropTable('Users');
  }
};
