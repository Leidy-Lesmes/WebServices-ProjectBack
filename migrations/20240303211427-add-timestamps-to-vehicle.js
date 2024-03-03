'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar las columnas createdAt y updatedAt a la tabla vehicle
    await queryInterface.addColumn('vehicle', 'createdAt', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()')
    });

    await queryInterface.addColumn('vehicle', 'updatedAt', {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()')
    });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar las columnas createdAt y updatedAt de la tabla vehicle
    await queryInterface.removeColumn('vehicle', 'createdAt');
    await queryInterface.removeColumn('vehicle', 'updatedAt');
  }
};
