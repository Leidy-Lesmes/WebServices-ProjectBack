const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const Vehicle = sequelize.define('Vehicle', {
    license_plate: {
        type: DataTypes.STRING(7),
        allowNull: false,
        primaryKey: true
    },
    entryTime: {
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.NOW // Puedes definir un valor predeterminado para la fecha de entrada
    },
    color: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    exitTime: {
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
    imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
});

module.exports = Vehicle;
