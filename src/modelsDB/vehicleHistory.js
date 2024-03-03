const { DataTypes } = require('sequelize');
const sequelize = require('./database');
const Vehicle = require('./vehicle');

const VehicleHistory = sequelize.define('VehicleHistory', {
    history_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    license_plate: {
        type: DataTypes.STRING(7),
        allowNull: false
    },
    entryTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    event_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    event_type: {
        type: DataTypes.ENUM('Request', 'Error'),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    method: {
        type: DataTypes.ENUM('GET', 'POST', 'PATCH'),
        allowNull: false
    },
    payload: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    error_payload: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

// Establecer la relación con la tabla VEHICLE
VehicleHistory.belongsTo(Vehicle, {
    foreignKey: {
        name: 'license_plate',
        allowNull: false
    },
    targetKey: 'license_plate',
    onDelete: 'CASCADE' // Eliminar registros de historial si el vehículo se elimina
});

module.exports = VehicleHistory;
