'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // User has many Stocks
      User.hasMany(models.stock, {
        foreignKey: 'userId',
        as: 'stocks'
      });
    }
  }
  User.init({
    kakaoId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: '카카오 사용자 ID'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    nickname: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '사용자',
      comment: '사용자 닉네임'
    },
    loginType: {
      type: DataTypes.ENUM('kakao', 'email'),
      allowNull: false,
      defaultValue: 'kakao',
      comment: '로그인 방식'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '계정 활성화 상태'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '마지막 로그인 시간'
    }
  }, {
    sequelize,
    modelName: 'user',
    tableName: 'Users',
  });
  return User;
}; 