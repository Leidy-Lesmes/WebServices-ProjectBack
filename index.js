process.env.SERVER_IP = '127.0.0.1'; 


const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const IP = process.env.IP || 'localhost';

app.use(express.json());
app.use(morgan('combined'));
app.use(cors());

let parkedCars = [];

// Registrar el ingreso a un parqueadero de un carro
app.post('/cars', (req, res) => {
    const { license_plate, color, image_url } = req.body;
    const entryTime = new Date();
    const state = "Activo"; // Establecer el estado como activo
    const car = { license_plate, color, entryTime, state, image_url };
    parkedCars.push(car);
    console.log('Car parked:', car);
    res.status(201).json(car);
});


// Listar los vehículos registrados
app.get('/cars', (req, res) => {
    res.json(parkedCars);
});

app.listen(PORT, () => {
    console.log(`Server running at http://${IP}:${PORT}/`);
});

// Retirar el carro usando la placa
app.patch('/cars', (req, res) => {
    const { license_plate } = req.body;
    const index = parkedCars.findIndex(car => car.license_plate === license_plate);
    if (index !== -1) {
        parkedCars[index].state = "Retirado"; // Cambiar el estado a "retirado"
        const updatedCar = parkedCars[index];
        console.log('Car state updated:', updatedCar);
        res.json(updatedCar);
    } else {
        res.status(404).json({ error: 'Car not found' });
    }
});

// Obtener todas las placas de los carros en estado activo
app.get('/cars/license-plates', (req, res) => {
    try {
        if (!parkedCars || parkedCars.length === 0) {
            return res.status(404).json({ error: 'No hay carros registrados' });
        }
        
        // Filtrar los carros en estado activo
        const activeCars = parkedCars.filter(car => car.state === 'Activo');

        // Obtener las placas de los carros en estado activo
        const licensePlates = activeCars.map(car => car.license_plate);

        res.json(licensePlates);
    } catch (error) {
        console.error('Error al obtener las placas de los carros:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



