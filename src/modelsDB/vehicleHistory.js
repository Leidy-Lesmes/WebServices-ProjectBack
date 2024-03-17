const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const VehicleHistory = sequelize.define('vehicle_history', {
    history_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    event_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    event_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
            isIn: [['Request', 'Error']]
        }
    },
    url: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    method: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
            isIn: [['GET', 'POST', 'PATCH']] // Asegura que el valor esté en este conjunto
        }
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
    },
    container_id: { 
        type: DataTypes.STRING(50), 
        allowNull: true 
    }
}, {
    tableName: 'vehicle_history',
    timestamps: false
});

module.exports = VehicleHistory;
