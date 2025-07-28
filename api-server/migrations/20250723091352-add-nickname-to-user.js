'use strict'; // 모듈 사용 선언 (JS의 엄격 모드 선언) 
/** @type {import('sequelize-cli').Migration} */

// 사용자 닉네임 추가 마이그레이션 파일
module.exports = {
  async up(queryInterface, Sequelize) {
    // users 테이블에 nickname 컬럼 추가
    await queryInterface.addColumn('Users', 'nickname', { 
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // users 테이블에서 nickname 컬럼 삭제
    await queryInterface.removeColumn('Users', 'nickname');
  }
};