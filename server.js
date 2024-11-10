const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

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
    port: 5432,
});

app.post('/register', upload.none(), async (req, res) => {
    console.log('POST /register');
    const { nombre_completo, rfc, edad, telefono, correo, contrasena, sueldo, id_estado_civil } = req.body;

    if (!nombre_completo || !rfc || !edad || !telefono || !correo || !contrasena || !id_estado_civil) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
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

    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM segundop.tr_cliente WHERE correo = $1',
            [correo]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

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

app.post('/add-cotizacion', upload.none(), async (req, res) => {
    console.log('POST /add-cotizacion');

    try {
        const {
            id_casa,
            id_tipo_prestamo,
            id_amortizacion,
            id_plazo,
            correo_cliente,
        } = req.body;

        if (!id_casa || !id_tipo_prestamo || !id_amortizacion || !id_plazo || !correo_cliente) 
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });

        const result = await pool.query(
            `INSERT INTO segundop.tr_cotizacion (
                id_casa, id_tipo_prestamo, id_amortizacion, id_plazo, correo_cliente
            ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_casa, id_tipo_prestamo, id_amortizacion, id_plazo, correo_cliente]
        );
        res.status(201).json({
            message: 'Cotización añadida exitosamente',
            cotizacion: result.rows[0],
        });
    } catch (err) {
        console.error('Error inserting cotización:', err);
        res.status(500).json({ error: 'Error al añadir la cotización' });
    }
});

app.put('/edit-profile', async (req, res) => {
    console.log('PUT /edit-profile');

    const {
        nombre_completo,
        rfc,
        edad,
        telefono,
        correo,
        sueldo,
        id_estado_civil
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE segundop.tr_cliente
         SET 
           nombre_completo = COALESCE($1, nombre_completo),
           rfc = COALESCE($2, rfc),
           edad = COALESCE($3, edad),
           telefono = COALESCE($4, telefono),
           sueldo = COALESCE($5, sueldo),
           id_estado_civil = COALESCE($6, id_estado_civil)
         WHERE correo = $7
         RETURNING *`,
            [nombre_completo, rfc, edad, telefono, sueldo, id_estado_civil, correo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating the user' });
    }
});

app.get('/estado-civil', async (req, res) => {
    console.log('GET /estado-civil');
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_estado_civil');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los estados civiles' });
    }
});

app.get('/cat-tipos-prest', async (req, res) => {
    console.log('GET /cat-tipos-prest');
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_tipo_prestamo');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los tipos de préstamos' });
    }
});

app.get('/cat-prestamistas', async (req, res) => {
    console.log('GET /cat-prestamistas');
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_amortizacion');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los prestamistas' });
    }
});

app.get('/cat-plazos', async (req, res) => {
    console.log('GET /cat-plazos');

    const { id_amortizacion } = req.query;
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_plazo WHERE id_amortizacion = $1', [id_amortizacion]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los plazos del banco' });
    }
});

app.get('/casas', async (req, res) => {
    console.log('GET /casas');
    try {
        const result = await pool.query('SELECT * FROM segundop.tr_casa');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las casas' });
    }
});

app.get('/get-user', async (req, res) => {
    console.log('GET /get-user');

    const { email } = req.query;

    try {
        const result = await pool.query('SELECT * FROM segundop.tr_cliente WHERE correo = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos del usuario' });
    }
});

app.get('/get-user-sueldo', async (req, res) => {
    console.log('GET /get-user-sueldo');

    const { email } = req.query;

    try {
        const result = await pool.query('SELECT sueldo FROM segundop.tr_cliente WHERE correo = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el sueldo del usuario' });
    }
});

app.get('/get-house', async (req, res) => {
    console.log('GET /get-house');

    const { id_casa } = req.query;
    try {
        const result = await pool.query('SELECT * FROM segundop.tr_casa WHERE id_casa = $1', [id_casa]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos de la casa' });
    }
});

app.get('/get-prestamo-byid', async (req, res) => {
    console.log('GET /get-prestamo-byid');

    const { id_tipo_prestamo } = req.query;
    try {
        const result = await pool.query('SELECT * FROM segundop.tc_tipo_prestamo WHERE id_tipo_prestamo = $1', [id_tipo_prestamo]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos del prestamo' });
    }
});

app.get('/get-amortizacion-byid', async (req, res) => {
    console.log('GET /get-amortizacion-byid');

    const { id_amortizacion } = req.query;
    try {
        const result = await pool.query('SELECT prestamista FROM segundop.tc_amortizacion WHERE id_amortizacion = $1', [id_amortizacion]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos de la amortizacion' });
    }
});

app.get('/get-plazo-byid', async (req, res) => {
    console.log('GET /get-plazo-byid');

    const { id_plazo } = req.query;
    try {
        const result = await pool.query('SELECT plazo FROM segundop.tc_plazo WHERE id_plazo = $1', [id_plazo]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos del plazo' });
    }
});

app.get('/get-coti-usr', async (req, res) => {
    console.log('GET /get-coti-usr');

    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM segundop.tr_cotizacion WHERE correo_cliente = $1', [email]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las cotizaciones del usuario' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
