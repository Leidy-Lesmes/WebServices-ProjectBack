@echo off
setlocal

REM Obtener los valores actuales de las variables de entorno
set "NODE_SERVICE_PORT=3003"
set "ID_SERVICE=server3003"

REM Incrementar los valores para el próximo contenedor
set /a NODE_SERVICE_PORT+=1
set /a ID_SERVICE+=1

REM Actualizar el archivo .env con los nuevos valores
set "DB_HOST=localhost"
set "DB_PORT=5433"
set "DB_NAME=parkinglotdb"
set "DB_USER=postgres"
set "DB_PASSWORD=a123"

REM Actualizar las variables de entorno en el Dockerfile
set "DOCKERFILE_PATH=C:\Users\ACER_COREI5\Documents\GitHub\WebServices-ProjectBack\Dockerfile-Server-3"

REM Crear la imagen Docker
docker build -t node_project_image --build-arg NODE_SERVICE_PORT=%NODE_SERVICE_PORT% --build-arg ID_SERVICE=%ID_SERVICE% -f %DOCKERFILE_PATH% .

REM Crear y ejecutar el contenedor
docker run -d -p %NODE_SERVICE_PORT%:3003 --env-file "C:\Users\ACER_COREI5\Documents\GitHub\WebServices-ProjectBack\.env" node_project_image

REM Notificar el éxito
echo Contenedor creado exitosamente en el puerto %NODE_SERVICE_PORT% con el ID %ID_SERVICE%

endlocal
