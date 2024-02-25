process.env.SERVER_IP = '127.0.0.1'; 

const express = require('express');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const IP = process.env.IP || 'localhost';

app.use(express.json());
app.use(morgan('combined'));
app.use(cors());

// Configuración de express-fileupload
app.use(fileUpload());

// Resto de tu código


let parkedCars = [];

// Registrar el ingreso a un parqueadero de un carro
app.post('/cars', async (req, res) => {
    const { license_plate, color } = req.body;
    const entryTime = new Date();
    const state = "Activo";
    let exitTime = null; // Inicializar exitTime como null

    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            console.log(req.files);
            return res.status(400).send('No se encontró ningún archivo.');
        }

        const file = req.files.image_path;
        const fileName = file.name;

        // Guardar el archivo en el servidor
        file.mv(`${__dirname}/uploads/${fileName}`, async function(err) {
            console.log ('El archivo se guardo en uploads: ' + fileName);
            if (err) {
                console.error('Error al guardar el archivo:', err);
                return res.status(500).json({ error: 'Error interno del servidor al guardar el archivo.' });
            }

            // Subir la imagen al servidor de Imgur
            const formData = new FormData();
            formData.append('image', fs.createReadStream(`${__dirname}/uploads/${fileName}`));
            formData.append('type', 'image');
            formData.append('title', 'Simple upload');
            formData.append('description', 'This is a simple image upload in Imgur');

            const imgurResponse = await axios.post('https://api.imgur.com/3/image', formData, {
                headers: {
                    Authorization: 'Client-ID ae2537bec814728', // Reemplaza YOUR_CLIENT_ID con tu ID de cliente de Imgur
                    ...formData.getHeaders()
                }
            });

            // Verificar si la subida de la imagen fue exitosa
            if (imgurResponse.data.success) {
                const image_url = imgurResponse.data.data.link;

                // Construir el objeto del carro
                const car = { license_plate, color, entryTime, state, exitTime, image_url }; // Agregar exitTime
                parkedCars.push(car);
                console.log('Car parked:', car);
                res.status(201).json(car);
            } else {
                res.status(500).json({ error: 'Error al subir la imagen al servidor de Imgur' });
            }
        });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
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
        parkedCars[index].exitTime = new Date(); // Agregar la hora de salida del carro
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
