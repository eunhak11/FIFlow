const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Star = sequelize.define('Star', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    symbol: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Stars',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'symbol']
      }
    ]
  });

  // User와의 관계 설정
  Star.associate = function(models) {
    Star.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Star;
}; 