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
const bodyParser = require('body-parser');

const balancerURL = process.env.BALANCER_URL;
const monitorURL = process.env.MONITOR_URL;
const port = process.env.NODE_SERVICE_PORT;
const ip = process.env.NODE_SERVICE_IP;
const containerId = process.env.ID_SERVICE;
console.log('Container ID:', containerId);

app.use(express.json());
app.use(morgan(':date[iso] :url :method :status :response-time ms - :res[content-length]'));
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(fileUpload());
let responseTimes = [];
let SERVERS = "";

// Middleware para comprobar la conexión a la base de datos
app.use(async (req, res, next) => {
    try {
        await sequelize.authenticate(); // Intenta autenticarse con la base de datos
        console.log('###### SERVER: Connection to database has been established successfully.');
        console.log();
        next(); // Continúa con la ejecución de las solicitudes de la API
    } catch (error) {
        console.error('###### SERVER: Unable to connect to the database:', error);
        console.log();
        res.status(500).json({ error: 'Unable to connect to the database' });
        console.log();
    }
});

// Configura el formato JSON personalizado para morgan
morgan.token('jsonlogs', (req, res) => {
    return JSON.stringify({
        date: new Date().toISOString(),
        url: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        responseTime: `${res.getHeader('X-Response-Time')} ms`,
        contentLength: res.getHeader('Content-Length')
    });
});
// Middleware para registrar logs solo para las rutas especificadas
const logMiddleware = morgan((tokens, req, res) => {
    // Solo utiliza el formato JSON personalizado para ciertas rutas
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'GET') {
        // Logs en formato JSON con la información de la solicitud
        console.log(`##### SERVER: 'El archivo se cargo en ${tokens.date(req, res)}', codigo de respuesta: Status: ${tokens.status(req, res)}`);
        console.log(tokens.jsonlogs(req, res));
        return tokens.jsonlogs(req, res);
    }
    return null; // Utiliza el formato predeterminado para otras rutas
});

const logRequestMiddleware = async (req, res, next) => {
    try {
        if (req.originalUrl.startsWith('/cars')) {
            const startTime = Date.now(); // Captura el tiempo justo antes de manejar la solicitud

            let payload;
            if (req.method === 'GET') {
                payload = JSON.stringify({
                    url: req.originalUrl,
                    query: req.query
                });
            } else {
                payload = JSON.stringify(req.body);
            }

            await VehicleHistory.create({
                event_type: 'Request',
                url: req.originalUrl,
                method: req.method,
                payload: payload,
                error_message: null,
                error_payload: null,
                container_id: containerId
            });

            // Una vez que la solicitud ha sido completada, calcula la diferencia de tiempo
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Agregar el tiempo de respuesta a la lista
            responseTimes.push({ containerId: containerId, responseTime: responseTime });
        }
        // Llama a `next()` para que la solicitud continúe siendo manejada
        next();

    } catch (error) {
        console.error('Error al registrar el historial de solicitud:', error);
        next(error);
    }
};

app.use(logRequestMiddleware);

// Middleware para registrar errores en el historial de solicitudes en la base de datos
const logErrorMiddleware = async (err, req, res, next) => {
    try {
        await VehicleHistory.create({
            event_type: 'Error',
            url: req.originalUrl,
            method: req.method,
            payload: JSON.stringify(req.body),
            error_message: err.message,
            error_payload: JSON.stringify(err),
            container_id: containerId
        });
        next();
    } catch (error) {
        console.error('###### SERVER: Error al registrar el historial de solicitud de error:', error);
        next(error);
    }
};

app.use('/cars', logMiddleware);
app.use('/cars/license-plates', logMiddleware)


// Configura el middleware de registro predeterminado para otras rutas
app.use(morgan('combined'));
app.use(logErrorMiddleware, (err, req, res, next) => {
    console.error('###### SERVER: Error de middleware:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Sincroniza los modelos con la base de datos
sequelize.sync().then(() => {
    console.log('###### SERVER: All models were synchronized successfully.');
    // Inicia tu servidor aquí
    app.listen(port, () => {
        const currentTime = new Date().toLocaleString();
        console.log('###### SERVER: Server start at:', currentTime);
        console.log(`###### SERVER: Server running at http://${ip}:${port}/`);
        console.log();
    });
}).catch(err => {
    console.error('###### SERVER: Error syncing models with database:', err);
    console.log();
});

// Registrar el ingreso a un parqueadero de un carro
app.post('/cars', logRequestMiddleware, async (req, res, next) => {
    const { license_plate, color } = req.body;
    const entrytime = new Date();
    const state = "Activo";
    let exittime = null;

    try {

        if (!req.files || Object.keys(req.files).length === 0) {
            console.log(req.files);
            // Log de error si no se encuentra ningún archivo
            console.error(`###### SERVER: [${new Date().toLocaleString()}] Error: No se encontró ningún archivo.`);
            console.log();
            return res.status(400).send('No se encontró ningún archivo.');
        }

        const file = req.files.image_path;
        const fileName = file.name;

        // Guardar el archivo en el servidor
        file.mv(`${__dirname}/uploads/${fileName}`, async function (err) {
            console.log('###### SERVER: El archivo se guardo en /uploads: ' + fileName);
            console.log();
            if (err) {
                // Log de error si hay un problema al guardar el archivo
                console.error(`###### SERVER: [${new Date().toLocaleString()}] Error al guardar el archivo:`, err);
                console.log();
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
                    Authorization: 'Client-ID ae2537bec814728',
                    ...formData.getHeaders()
                }
            });

            console.log(`[${new Date().toLocaleString()}] Status: ${imgurResponse.status}`);

            if (imgurResponse.data.success) {
                const image_url = imgurResponse.data.data.link;
                console.log('###### SERVER: El archivo se cargo correctamente al servidor de imagenes en el link  ' + image_url);
                console.log();

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
                res.status(201).json({ message: 'El vehículo se registró correctamente' });
            } else {
                res.status(500).json({ error: 'Error al subir la imagen al servidor de Imgur' });
            }
        });
    } catch (error) {
        console.error(`###### SERVER: [${new Date().toLocaleString()}] Error al procesar la solicitud:`, error);
        console.log();
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Listar los vehículos registrados
app.get('/cars', logRequestMiddleware, async (req, res, next) => {
    try {
        const vehicles = await Vehicle.findAll();
        const payload = JSON.stringify(req.query);

        await VehicleHistory.create({
            event_type: 'Request',
            url: req.originalUrl,
            method: req.method,
            payload: payload,
            error_message: null,
            error_payload: null
        });
        res.json(vehicles);
    } catch (error) {
        console.error('###### SERVER: Error al obtener los vehículos:', error);
        await VehicleHistory.create({
            event_type: 'Error',
            url: req.originalUrl,
            method: req.method,
            payload: JSON.stringify(req.query),
            error_message: error.message,
            error_payload: JSON.stringify(error)
        });
        console.log();
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Retirar el carro usando la placa
app.patch('/cars', logRequestMiddleware, async (req, res, next) => {
    const { license_plate } = req.body;

    try {
        const vehicle = await Vehicle.findOne({ where: { license_plate } });

        if (vehicle) {
            vehicle.state = "Retirado";
            vehicle.exittime = new Date();

            await vehicle.save();

            console.log('###### SERVER: Car state updated:', vehicle);
            console.log();
            res.json(vehicle);
        } else {
            res.status(404).json({ error: 'Car not found' });
        }
    } catch (error) {
        console.error('###### SERVER: Error updating car state:', error);
        console.log();
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Obtener todas las placas de los carros en estado activo
app.get('/cars/license-plates', logRequestMiddleware, async (req, res, next) => {
    try {
        const activeVehicles = await Vehicle.findAll({ where: { state: 'Activo' } });

        if (activeVehicles.length === 0) {
            await VehicleHistory.create({
                event_type: 'Error',
                url: req.originalUrl,
                method: req.method,
                payload: null,
                error_message: 'No hay carros activos en el parqueadero.',
                error_payload: null
            });

            return res.status(404).json({ error: 'No hay carros activos en el parqueadero.' });
        }

        const licensePlates = activeVehicles.map(vehicle => vehicle.license_plate);
        await VehicleHistory.create({
            event_type: 'Request',
            url: req.originalUrl,
            method: req.method,
            payload: JSON.stringify(licensePlates),
            error_message: null,
            error_payload: null
        });

        res.json(licensePlates);
    } catch (error) {
        console.error('###### SERVER: Error al obtener las placas activas de los carros:', error);

        await VehicleHistory.create({
            event_type: 'Error',
            url: req.originalUrl,
            method: req.method,
            payload: null,
            error_message: error.message,
            error_payload: JSON.stringify(error)
        });

        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

//ping
app.get('/ping', (req, res, next) => {
    const randomDelay = Math.floor(Math.random() * 8000);
    setTimeout(() => {
        res.send('pong');
    }, randomDelay);
});

// Ruta para realizar ping y obtener información de solicitudes
app.get('/ping-and-requests', async (req, res) => {
    try {
        // Realizar ping
        const randomDelay = Math.floor(Math.random() * 500);
        setTimeout(async () => {
            // Obtener la cantidad total de solicitudes
            const totalRequests = await VehicleHistory.count();

            // Obtener la cantidad de errores en event_type "Error"
            const errorRequests = await VehicleHistory.count({ where: { event_type: 'Error' } });

            // Obtener la cantidad de cada tipo de método
            const postRequests = await VehicleHistory.count({ where: { method: 'POST' } });
            const getRequests = await VehicleHistory.count({ where: { method: 'GET' } });
            const patchRequests = await VehicleHistory.count({ where: { method: 'PATCH' } });

            res.json({ totalRequests, errorRequests, postRequests, getRequests, patchRequests });
        }, randomDelay);
    } catch (error) {
        console.error('Error al realizar ping y obtener información de solicitudes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Agrega el método requestFilter al final del archivo del primer proyecto
app.get('/request-filter', async (req, res) => {
    try {
        const registros = await VehicleHistory.findAll();

        // Mapear los registros para obtener solo los campos deseados
        const filteredRecords = registros.map(registro => ({
            event_time: registro.event_time,
            url: registro.url,
            method: registro.method,
            payload: registro.payload,
            container_id: registro.container_id
        }));

        res.json({ success: true, data: filteredRecords });
    } catch (error) {
        console.error('Error al filtrar datos:', error);
        res.status(500).json({ success: false, error: 'Error al filtrar datos' });
    }
});

app.get('/response-times', (req, res) => {
    try {
        res.json(responseTimes);
    } catch (error) {
        console.error('Error al obtener los tiempos de respuesta:', error);
        res.status(500).json({ success: false, error: 'Error al obtener los tiempos de respuesta' });
    }
});

axios.post(balancerURL, {
    ip: ip,
    port: port
})

axios.post(monitorURL, {
    ip: ip,
    port: port
})

app.post('/register-new-service', (req, res) => {
    const ip = req.ip; 
    const port = req.app.settings.port; 

    console.log(`IP: ${ip}, Puerto: ${port}`);

    // Agregar el nuevo servidor a la lista de servidores
    const newServer = `${ip}:${port}`;
    if (SERVERS) {
        SERVERS += `,${newServer}`;
    } else {
        SERVERS = newServer;
    }

    console.log("Lista de servidores actualizada:", SERVERS);

    // Enviar datos al balanceador
    axios.post(balancerURL, {
        ip: ip,
        port: port
    })
    .then(response => {
        console.log('Datos enviados exitosamente al balanceador:', response.data);
        res.status(200).json({ success: true, message: 'Datos enviados exitosamente al balanceador' });
    })
    .catch(error => {
        console.error('Error al enviar datos al balanceador:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    });

    // Enviar datos al monitor
    axios.post(monitorURL, {
        ip: ip,
        port: port
    })
    .then(response => {
        console.log('Datos enviados exitosamente al monitor:', response.data);
    })
    .catch(error => {
        console.error('Error al enviar datos al monitor:', error);
    });
});
