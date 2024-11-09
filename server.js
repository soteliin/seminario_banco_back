const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const upload = multer();

const pool = new Pool({
    user: 'postgres',
    host: '192.168.100.17',
    database: 'postgres',
    password: 'postgres',
    port: 5432, // Default port for PostgreSQL
});

app.post('/register', upload.none(), async (req, res) => {
    console.log('POST /register');
    // Access form-data fields using `req.body`
    const { nombre_completo, rfc, edad, telefono, correo, contrasena, sueldo, id_estado_civil } = req.body;

    if (!nombre_completo || !rfc || !edad || !telefono || !correo || !contrasena || !id_estado_civil) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const result = await pool.query(
            'INSERT INTO segundop.tr_cliente (nombre_completo, rfc, edad, telefono, correo, contrasena, sueldo, id_estado_civil) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [nombre_completo, rfc, edad, telefono, correo, hashedPassword, sueldo, id_estado_civil]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

app.post('/login', upload.none(), async (req, res) => {
    console.log('POST /login');

    // Access form-data fields using `req.body`
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Check if the user exists
        const result = await pool.query(
            'SELECT * FROM segundop.tr_cliente WHERE correo = $1',
            [correo]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            // Compare the provided password with the hashed password in the database
            const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);

            if (passwordMatch) {
                res.status(200).json({ user });
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } else {
            console.error(correo)
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

app.get('/estado-civil', async (req, res) => {
    console.log('GET /estado-civil');
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_estado_civil');
        res.status(200).json(result.rows); // Return the records as JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los estados civiles' });
    }
});

app.get('/casas', async (req, res) => {
    console.log('GET /casas');
    try {
        const result = await pool.query('SELECT * FROM segundop.tr_casa');
        res.status(200).json(result.rows); // Return the records as JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las casas' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
