// routes/dataLayer.js

var express = require('express');
var router = express.Router();
const { exec } = require('child_process');

// Crear Data Store
router.post('/create-data-store', (req, res) => {
    const { fee } = req.body;

    if (!fee) {
        return res.status(400).json({ error: 'Fee es requerido' });
    }

    const command = `chia data create_data_store -m ${fee}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Data Store creado exitosamente',
            output: stdout
        });
    });
});

// Actualizar Data Store
router.post('/update-data-store', (req, res) => {
    const { id, actions } = req.body;

    if (!id || !actions) {
        return res.status(400).json({ error: 'ID y acciones son requeridos' });
    }

    const changelist = Object.keys(actions).map(key => ({
        action: 'insert',
        key,
        value: actions[key]
    }));

    const command = `chia data update_data_store --id=${id} -d '${JSON.stringify(changelist)}'`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Data Store actualizado exitosamente',
            output: stdout
        });
    });
});

// Consultar Data Store
router.get('/get-data-store', (req, res) => {
    const { id, key } = req.query;

    if (!id || !key) {
        return res.status(400).json({ error: 'ID y key son requeridos' });
    }

    const command = `chia data get_value --id=${id} --key=${key}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el comando: ${error.message}`);
            return res.status(500).json({
                error: `Error ejecutando el comando: ${error.message}`,
                details: stderr,
                suggestion: 'Verifique que el servicio RPC de Chia Data Layer esté corriendo y accesible en el puerto 8562.'
            });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({
                error: 'Error en la ejecución del comando',
                details: stderr
            });
        }
        console.log(`stdout: ${stdout}`);
        res.json({
            message: 'Consulta realizada exitosamente',
            output: stdout
        });
    });
});

module.exports = router;
