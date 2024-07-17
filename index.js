const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/proxy/', async (req, res) => {
    const { method, url, body, headers } = req;
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('URL is required');
    }

    try {
        const response = await axios({
            method: method,
            url: targetUrl,
            data: body,
            headers: { ...headers, host: new URL(targetUrl).host }
        });

        res.status(response.status).send(response.data);
    } catch (error) {
        const { response } = error;
        if (response) {
            res.status(response.status).send(response.data);
        } else {
            res.status(500).send('An error occurred');
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;