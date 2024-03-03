const { DataTypes } = require('sequelize');
const sequelize = require('../database');


const Vehicle = sequelize.define('Vehicle', {
    license_plate: {
        type: DataTypes.STRING(7),
        allowNull: false,
        primaryKey: true
    },
    entrytime: {
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.NOW
    },
    color: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    exittime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    state: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    image: {
        type: DataTypes.BLOB,
        allowNull: false
    },
    imageurl: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'vehicle'
});

module.exports = Vehicle;