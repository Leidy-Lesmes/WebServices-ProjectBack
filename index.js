const express = require('express');
require("dotenv").config();
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const cors = require('cors');

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const sequelize = require('./src/database');
const Vehicle = require('./src/modelsDB/vehicle');
const VehicleHistory = require('./src/modelsDB/vehicleHistory');


const app = express();
const port = process.env.NODE_SERVICE_PORT;
const ip = process.env.NODE_SERVICE_IP;

app.use(express.json());
app.use(morgan('combined'));
app.use(cors());

app.use(fileUpload());

let parkedCars = [];

// Middleware para comprobar la conexión a la base de datos
app.use(async (req, res, next) => {
    try {
        await sequelize.authenticate(); // Intenta autenticarse con la base de datos
        console.log('Connection to database has been established successfully.');
        next(); // Continúa con la ejecución de las solicitudes de la API
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        res.status(500).json({ error: 'Unable to connect to the database' });
    }
});

// Sincroniza los modelos con la base de datos
sequelize.sync().then(() => {
    console.log('All models were synchronized successfully.');
    // Inicia tu servidor aquí
    app.listen(port, () => {
        const currentTime = new Date().toLocaleString();
        console.log('Server start at:', currentTime);
        console.log(`Server running at http://${ip}:${port}/`);
    });
}).catch(err => {
    console.error('Error syncing models with database:', err);
});

// Registrar el ingreso a un parqueadero de un carro
app.post('/cars', async (req, res) => {
    const { license_plate, color } = req.body;
    const entrytime = new Date();
    const state = "Activo";
    let exittime = null;

    try {

        if (!req.files || Object.keys(req.files).length === 0) {
            console.log(req.files);
            // Log de error si no se encuentra ningún archivo
            console.error(`[${new Date().toLocaleString()}] Error: No se encontró ningún archivo.`);
            return res.status(400).send('No se encontró ningún archivo.');
        }

        const file = req.files.image_path;
        const fileName = file.name;

        // Guardar el archivo en el servidor
        file.mv(`${__dirname}/uploads/${fileName}`, async function (err) {
            console.log('El archivo se guardo en /uploads: ' + fileName);
            if (err) {
                // Log de error si hay un problema al guardar el archivo
                console.error(`[${new Date().toLocaleString()}] Error al guardar el archivo:`, err);
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

            // Logs: Código de estado de la petición
            console.log(`[${new Date().toLocaleString()}] Status: ${imgurResponse.status}`);

            // Verificar si la subida de la imagen fue exitosa
            if (imgurResponse.data.success) {
                const image_url = imgurResponse.data.data.link;
                console.log('El archivo se cargo correctamente al servidor de imagenes en el link  ' + image_url);

                // Leer los bytes de la imagen
                const imageBytes = fs.readFileSync(`${__dirname}/uploads/${fileName}`);

                const newVehicle = await Vehicle.create({
                    license_plate,
                    entrytime,
                    color,
                    exittime,
                    state,
                    image: imageBytes,
                    imageurl: image_url
                });
                

            } else {
                res.status(500).json({ error: 'Error al subir la imagen al servidor de Imgur' });
            }
        });
    } catch (error) {
        // Log de error si hay un error al procesar la solicitud
        console.error(`[${new Date().toLocaleString()}] Error al procesar la solicitud:`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// Listar los vehículos registrados
app.get('/cars', async (req, res) => {
    try {
        const vehicles = await Vehicle.findAll();
        res.json(vehicles);
    } catch (error) {
        console.error('Error al obtener los vehículos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Retirar el carro usando la placa
app.patch('/cars', async (req, res) => {
    const { license_plate } = req.body;
    
    try {
        const vehicle = await Vehicle.findOne({ where: { license_plate } });
        
        if (vehicle) {
            vehicle.state = "Retirado";
            vehicle.exittime = new Date(); // Agregar la hora actual en exitTime
            
            await vehicle.save();

            console.log('Car state updated:', vehicle);
            res.json(vehicle);
        } else {
            res.status(404).json({ error: 'Car not found' });
        }
    } catch (error) {
        console.error('Error updating car state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Obtener todas las placas de los carros en estado activo
app.get('/cars/license-plates', (req, res) => {
    try {
        if (!parkedCars || parkedCars.length === 0) {
            return res.status(404).json({ error: 'No hay carros registrados' });
        }
        const activeCars = parkedCars.filter(car => car.state === 'Activo');
        const licensePlates = activeCars.map(car => car.license_plate);
        res.json(licensePlates);
    } catch (error) {
        console.error('Error al obtener las placas de los carros:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
